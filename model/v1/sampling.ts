import { userAuthenticationData } from "../../interface/user";
import Sampling from "../../database/schema/sampling";
import {
  Entity,
  EntityType,
  Roles,
  RoleSlug,
  STATUS_CODES,
  STATUS_MESSAGE,
} from "../../configs/constants";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import {
  centerId,
  deleteFileOnAWS,
  paginate,
  uploadFileOnAWS,
} from "../../helper/utils";
import Image from "../../database/schema/images";
import SamplingUnits from "../../database/schema/sampling_units";
import SamplingAssessments from "../../database/schema/sampling_assessments";
import Units from "../../database/schema/units";
import Assessment from "../../database/schema/assessment";
import { Op, Order } from "sequelize";
import User from "../../database/schema/user";
import AssessmentUnits from "../../database/schema/assessment_units";
import Qualifications from "../../database/schema/qualifications";
import UserUnits from "../../database/schema/user_units";
import Role from "../../database/schema/role";
import UserAssessor from "../../database/schema/user_assessor";
import AssessorIQA from "../../database/schema/assessor_iqa";
import UserQualification from "../../database/schema/user_qualification";
const { sequelize } = require("../../configs/database");

class SamplingService {
  static async getFileType(mimeType: string) {
    if (!mimeType) return EntityType.OTHER;

    if (mimeType.startsWith("image/")) return EntityType.IMAGE;
    if (mimeType.startsWith("video/")) return EntityType.VIDEO;
    if (mimeType.startsWith("audio/")) return EntityType.AUDIO;

    // Common document types
    if (
      mimeType === "application/pdf" ||
      mimeType === "application/msword" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return EntityType.DOCUMENT;
    }

    return EntityType.OTHER;
  }
  // Create Sampling
  static async createSampling(
    data: any,
    userData: userAuthenticationData,
    files: any
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      data.reference_type = data.unit_ids ? 1 : data.assessment_ids ? 2 : null;
      data.created_by = userData.id;
      data.center_id = userData.center_id;
      let createSampling = await Sampling.create(data, { transaction });
      // Create Sampling Units
      let iqaRoleId = await Role.findOne({
        where: { role_slug: RoleSlug.IQA },
      });
      let isIQA = await User.findOne({
        where: { id: userData.id, role: iqaRoleId.id },
      });
      if (data.unit_ids) {
        const unitIds = data.unit_ids
          .toString()
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id); // remove empty strings

        for (const unitId of unitIds) {
          await SamplingUnits.create(
            { sampling_id: createSampling.id, unit_id: unitId },
            { transaction }
          );
          await UserUnits.update(
            {
              is_sampling: true,
              reference_type: 1,
              iqa_id: isIQA.id,
              sampled_at: new Date().toISOString(),
            },
            { where: { unit_id: unitId, user_id: data.learner_id } }
          );
        }
      }
      // Create Sampling Assessments
      if (data.assessment_ids) {
        const assessmentIds = data.assessment_ids
          .toString()
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id); // remove empty strings

        await Assessment.update(
          {
            is_sampling: true,
            iqa_id: isIQA.id,
            sampled_at: new Date().toISOString(),
          },
          { where: { id: { [Op.in]: assessmentIds } } }
        );
        // Find All Unit which assigned to assessment
        let assessment_ = await AssessmentUnits.findAll({
          where: { assessment_id: { [Op.in]: assessmentIds } },
        });
        let unitIds = assessment_.map((data) => data.unit_id);
        await UserUnits.update(
          {
            is_sampling: true,
            reference_type: 2,
            iqa_id: isIQA.id,
            sampled_at: new Date().toISOString(),
          },
          { where: { unit_id: { [Op.in]: unitIds }, user_id: data.learner_id } }
        );
        for (const assessmentId of assessmentIds) {
          await SamplingAssessments.create(
            { sampling_id: createSampling.id, assessment_id: assessmentId },
            { transaction }
          );
        }
      }
      // Create Sampling Files
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `sampling/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;
            const fileCreated = await Image.create(
              {
                entity_type: Entity.SAMPLING,
                entity_id: createSampling.id,
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
          } catch (error) {
            console.error("Error uploading file:", error);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: createSampling,
        message: "Sampling created successfully",
      };
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Update Sampling
  static async updateSampling(
    data: any,
    userData: userAuthenticationData,
    files: any
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Delete existing Sampling Units and recreate
      await SamplingUnits.destroy({
        where: { sampling_id: data.id },
        transaction,
      });
      if (data.unit_ids && data.unit_ids.length > 0) {
        data.reference_type = 1;
        for (const unitId of data.unit_ids) {
          await SamplingUnits.create(
            { sampling_id: data.id, unit_id: unitId },
            { transaction }
          );
        }
      }

      // Delete existing Sampling Assessments and recreate
      await SamplingAssessments.destroy({
        where: { sampling_id: data.id },
        transaction,
      });
      if (data.assessment_ids && data.assessment_ids.length > 0) {
        data.reference_type = 2;
        for (const assessmentId of data.assessment_ids) {
          await SamplingAssessments.create(
            { sampling_id: data.id, assessment_id: assessmentId },
            { transaction }
          );
        }
      }
      // Delete Sampling Files
      if (data.delete_files) {
        for (const fileId of data.delete_files) {
          const file = await Image.findOne({
            where: {
              id: fileId,
              entity_type: Entity.SAMPLING,
              entity_id: data.id,
            },
            transaction,
          });
          if (file) {
            await Image.destroy({
              where: {
                id: fileId,
                entity_type: Entity.SAMPLING,
                entity_id: data.id,
              },
              transaction,
            });
            await deleteFileOnAWS(file.image);
          }
        }
      }
      // Create Sampling Files
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `sampling/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;
            const fileCreated = await Image.create(
              {
                entity_type: Entity.SAMPLING,
                entity_id: data.id,
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
          } catch (error) {
            console.error("Error uploading file:", error);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }
      let updateSampling = await Sampling.update(data, {
        where: { id: data.id },
        transaction,
      });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Sampling updated successfully",
      };
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Sampling
  static async deleteSampling(
    id: number,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      await Sampling.destroy({ where: { id }, force: true, transaction });
      await SamplingUnits.destroy({
        where: { sampling_id: id },
        force: true,
        transaction,
      });
      await SamplingAssessments.destroy({
        where: { sampling_id: id },
        force: true,
        transaction,
      });
      await Image.destroy({
        where: { entity_type: Entity.SAMPLING, entity_id: id },
        force: true,
        transaction,
      });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Sampling deleted successfully",
      };
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get Sampling
  static async getSampling(id: number): Promise<any> {
    try {
      let sampling_ = await Sampling.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "assessor",
            attributes: ["id", "name", "surname"],
          },
          {
            model: Qualifications,
            as: "qualification",
            attributes: ["id", "name", "qualification_no"],
          },
          {
            model: User,
            as: "learner",
            attributes: ["id", "name", "surname"],
          },
          {
            model: Units,
            as: "units",
            through: { attributes: [] },
          },
          {
            model: Assessment,
            as: "assessments",
            through: { attributes: [] },
          },
          {
            model: Image,
            as: "images_sampling",
            attributes: [
              "id",
              "image",
              "image_type",
              "image_name",
              "image_size",
            ],
          },
        ],
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: sampling_,
        message: "Sampling retrieved successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // List Sampling
  static async listSampling(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "DESC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      // Login user is IQA
      let iqaUser = await User.findOne({
        where: { id: userData.id },
        include: [
          {
            model: Role,
            as: "role_data",
            required: true,
            where: { role_slug: RoleSlug.IQA },
          },
        ],
      });

      let sampling;
      if (iqaUser || data.is_iqa) {
        let iqaId = data.is_iqa ? data.is_iqa : userData.id;
        // Find All Learners under IQA
        // ✅ Get all assessor IDs under this IQA
        let assessorWhereCondition = {
          deletedAt: null,
          iqa_id: iqaId,
        }
        if (data.assessor_id) {
          assessorWhereCondition['assessor_id'] = data.assessor_id;
        }
        const assessorIQAList = await AssessorIQA.findAll({
          where: assessorWhereCondition,
          attributes: ["assessor_id"],
        });
        const assessorIds = assessorIQAList.map((item) => item.assessor_id);
        if (!assessorIds.length) {
          return {
            status: STATUS_CODES.SUCCESS,
            data: [],
            message: "No assessors assigned to this IQA",
          };
        }
        // ✅ Get all learner IDs assigned to those assessors
        const learnerAssessorList = await UserAssessor.findAll({
          where: { assessor_id: { [Op.in]: assessorIds } },
          attributes: ["user_id", "assessor_id"],
        });
        const learnerIds = learnerAssessorList.map((item) => item.user_id);
        if (!learnerIds.length) {
          return {
            status: STATUS_CODES.SUCCESS,
            data: [],
            message: "No learners found for this IQA",
          };
        }
        let centerId = data.center_id ? data.center_id : userData.center_id;
        // Where condition
        let whereCondition: any = {
          deletedAt: null,
          center_id: centerId,
        };
        sampling = await Sampling.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: User,
              as: "learner",
              attributes: ["id", "name", "surname"],
              where: { id: { [Op.in]: learnerIds } },
            },
          ],
          attributes: ["id", "sampling_type", "is_accept_sampling", "date"],
          limit: fetchAll ? undefined : limit,
          offset: fetchAll ? undefined : offset,
          order,
          distinct: true,
        });
        sampling = JSON.parse(JSON.stringify(sampling));
      } else {
        // Where condition
        let whereCondition: any = {
          deletedAt: null,
          center_id: userData.center_id,
        };
        let includeWhereCondition: any = {};
        if (data.assessor_id) {
          let learnerAssessorList = await UserAssessor.findAll({
            where: { assessor_id: data.assessor_id },
            attributes: ["user_id"],
          });
          const learnerIds = learnerAssessorList.map((item) => item.user_id);
          if (learnerIds.length) {
            includeWhereCondition.id = { [Op.in]: learnerIds };
          }
        }
        sampling = await Sampling.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: User,
              as: "learner",
              where: includeWhereCondition,
              attributes: ["id", "name", "surname"],
            },
          ],
          attributes: ["id", "sampling_type", "is_accept_sampling", "date"],
          limit: fetchAll ? undefined : limit,
          offset: fetchAll ? undefined : offset,
          order,
          distinct: true,
        });
        sampling = JSON.parse(JSON.stringify(sampling));
      }

      const pagination = await paginate(sampling, limit, page, fetchAll);
      const response = {
        data: sampling.rows,
        pagination: pagination,
      };
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Sampling retrieved successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get Sampling Matrix by Qualification
  static async getSamplingMatrixByQualification(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      // --- fetch assessors -> learner ids
      // const userAssessors = await UserAssessor.findAll({
      //   where: { assessor_id: data.assessor_id },
      //   attributes: ["user_id"],
      // });
      // const learnerIds = userAssessors.map((ua) => ua.user_id);

      let centerId = data.center_id ? data.center_id : userData.center_id;

      let finalAllLearners = await User.findAll({
        where: {
          center_id: centerId,
          role: Roles.LEARNER,
          deletedAt: null,
        },
        attributes: ["id", "name", "surname"],
      });
      const finalAllLearnerIds = finalAllLearners.map((learner) => learner.id);
      
      // --- fetch learner qualifications (includes sign off flags)
      const learnerQualifications = await UserQualification.findAll({
        where: {
          user_id: { [Op.in]: finalAllLearnerIds },
          qualification_id: data.qualification_id,
        },
        attributes: [
          "user_id",
          "qualification_id",
          "is_signed_off",
          "is_optional_assigned",
        ],
      });

      const finalLearnerIds = learnerQualifications.map((lq) => lq.user_id);
      const qualificationIds = learnerQualifications.map(
        (lq) => lq.qualification_id
      );

      let learnerWhere: any = {
        id: { [Op.in]: finalLearnerIds },
        role: Roles.LEARNER,
        deletedAt: null,
        center_id: centerId,
      };

      if (data.learner_name_search) {
        learnerWhere[Op.or] = [
          { name: { [Op.like]: `%${data.learner_name_search}%` } },
          { surname: { [Op.like]: `%${data.learner_name_search}%` } },
        ];
      }

      // --- fetch learners
      const learners = await User.findAll({
        where: learnerWhere,
        attributes: ["id", "name", "surname"],
      });

      // --- fetch qualifications
      const qualifications = await Qualifications.findAll({
        where: { id: { [Op.in]: qualificationIds } },
        attributes: ["id", "name", "qualification_no"],
      });

      // --- fetch units for those qualifications
      // NOTE: I've included qualification_id here so we can group units by qualification.
      const units = await Units.findAll({
        where: { qualification_id: { [Op.in]: qualificationIds } },
        attributes: [
          "id",
          "unit_title",
          "unit_number",
          "unit_ref_no",
          "qualification_id",
        ],
      });

      const unitIds = units.map((u) => u.id);

      // --- fetch userUnits (sampling data) and include IQA user
      const userUnits = await UserUnits.findAll({
        where: {
          user_id: { [Op.in]: finalLearnerIds },
          unit_id: { [Op.in]: unitIds },
        },
        include: [
          {
            model: User,
            as: "iqa",
            attributes: ["id", "name", "surname"],
          },
        ],
        attributes: [
          "user_id",
          "unit_id",
          "is_sampling",
          "is_assigned",
          "iqa_id",
          "sampled_at",
        ],
      });

      // Helper: find userUnit quickly
      const userUnitKeyMap = new Map<string, any>();
      userUnits.forEach((uu) => {
        // build composite key "userId|unitId"
        const key = `${uu.user_id}|${uu.unit_id}`;
        userUnitKeyMap.set(key, uu);
      });

      // Helper: map qualifications by id
      const qualMap = new Map<number, any>();
      qualifications.forEach((q) => qualMap.set(q.id, q));

      // Helper: group units by qualification_id
      const unitsByQualification = new Map<number, any[]>();
      units.forEach((u) => {
        const qid = u.qualification_id;
        if (!unitsByQualification.has(qid)) unitsByQualification.set(qid, []);
        unitsByQualification.get(qid).push(u);
      });

      // Build response array
      const response = learners.map((learner) => {
        // get learner's UserQualification entry (we assume single qualification per learner)
        const lq = learnerQualifications.find((x) => x.user_id === learner.id);

        const qualificationObj = lq ? qualMap.get(lq.qualification_id) : null;

        // Build units list for this qualification (if none, still return empty units array)
        const qUnits = qualificationObj
          ? unitsByQualification.get(qualificationObj.id) || []
          : [];

        const unitsArr = qUnits.map((unit) => {
          const key = `${learner.id}|${unit.id}`;
          const uu = userUnitKeyMap.get(key);

          return {
            id: unit.id,
            unitNumber: unit.unit_number, // per your fields
            unitTitle: unit.unit_title, // per your fields
            is_sampled: uu ? !!uu.is_sampling : false,
            is_assigned: uu ? !!uu.is_assigned : false,
            iqa:
              uu && uu.iqa
                ? {
                    id: uu.iqa.id,
                    name: uu.iqa.name,
                    surname: uu.iqa.surname,
                  }
                : null,
            sampled_date: uu ? uu.sampled_at : null,
          };
        });

        return {
          learner_id: learner.id,
          learner_name: `${learner.name} ${learner.surname}`,
          is_signed_off: lq ? !!lq.is_signed_off : false,
          is_optional_assigned: lq ? !!lq.is_optional_assigned : false,
          qualifications: qualificationObj
            ? [
                {
                  qualification_id: qualificationObj.id,
                  qualification_name: qualificationObj.name,
                  units: unitsArr,
                },
              ]
            : [],
        };
      });

      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "IQA Sampling Matrix Report retrieved successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

export default SamplingService;
