require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { paginate, generateSecurePassword, centerId } from "../../helper/utils";
import { emailService } from "../../helper/emailService";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import Center from "../../database/schema/center";
import AssessorIQA from "../../database/schema/assessor_iqa";
const { sequelize } = require("../../configs/database");

class AssessorService {
  // Create Assessor
  static async createAssessor(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // @ts-ignore
      if (
        data.id === null ||
        data.id === undefined ||
        data.id === 0 ||
        data.id === ""
      ) {
        delete data.id;
      }
      // Check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          deletedAt: null,
          [Op.or]: [
            {
              center_id: userData.center_id,
              role: Roles.ASSESSOR,
            },
            {
              center_id: { [Op.ne]: userData.center_id },
            },
          ],
        },
        attributes: ["id"],
      });
      if (isEmailUsed) {
        if (isEmailUsed.center_id === userData.center_id) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Email already used for this role in current center",
          };
        } else {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Email already used in another center",
          };
        }
      }
      data.role = Roles.ASSESSOR;
      data.center_id = userData.center_id;
      data.password = await generateSecurePassword();
      let createUser = await User.create(data, { transaction });
      // Create Qualification of assessor
      // Parse qualifications (assuming it's a comma-separated string)
      if (!data.qualifications) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification Required",
        };
      }
      const qualificationIds = data.qualifications
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter(Boolean);

      // Validate qualifications exist
      const validQualifications = await Qualifications.findAll({
        where: { id: qualificationIds },
      });

      if (validQualifications.length !== qualificationIds.length) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Some qualifications are invalid",
        };
      }
      await UserQualification.bulkCreate(
        qualificationIds.map((qid) => ({
          user_id: createUser.id,
          qualification_id: qid,
        }))
      );

      // Send Email to Assessor
      await emailService.sendAssessorAccountEmail(
        createUser.name,
        createUser.email,
        data.password // Use the original password before hashing
      );

      await transaction.commit();
      return {
        data: createUser,
        message: "Assessor Created Successfully",
        status: STATUS_CODES.SUCCESS,
      };
    } catch (error) {
      await transaction.rollback();
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Update Assessor
  static async updateAssessor(
    data: UserInterface,
    userId: string | number,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check is valid user
      let isValidUser = await User.findOne({
        where: { id: userId, deletedAt: null },
      });
      if (!isValidUser) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "User not found",
        };
      }
      // check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: userId },
          deletedAt: null,
          [Op.or]: [
            {
              center_id: userData.center_id,
              role: Roles.ASSESSOR,
            },
            {
              center_id: { [Op.ne]: userData.center_id },
            },
          ],
        },
      });
      if (isEmailUsed) {
        if (isEmailUsed.center_id === userData.center_id) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Email already used for this role in current center",
          };
        } else {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Email already used in another center",
          };
        }
      }
      data.center_id = userData.center_id;
      await User.update(data, {
        where: { id: userId },
      });

      if (data.qualifications) {
        const qualificationIds = data.qualifications
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);

        // Validate qualification IDs
        const validQualifications = await Qualifications.findAll({
          where: { id: qualificationIds },
        });

        if (validQualifications.length !== qualificationIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some qualifications are invalid",
          };
        }

        // Remove old qualifications
        await UserQualification.destroy({
          where: { user_id: userId },
          force: true,
        });

        // Insert updated qualifications
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: +userId,
            qualification_id: qid,
          }))
        );
      }
      if (data.email && isValidUser.email !== data.email) {
        // Gernate Password
        let password = await generateSecurePassword();
        await User.update(
          { password: password },
          { where: { id: isValidUser.id }, transaction }
        );
        await emailService.sendAssessorAccountEmail(
          data.name,
          data.email,
          password
        );
      }
      await transaction.commit();
      return {
        data: {},
        status: STATUS_CODES.SUCCESS,
        message: "Assessor Updated Successfully",
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

  // List Assessor
  static async listAssessor(data, userData: userAuthenticationData) {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "DESC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      // Where condition
      let whereCondition: any = { deletedAt: null, role: Roles.ASSESSOR };
      let center_id = data.center_id
        ? data.center_id
        : await centerId(userData);
      let center_data;
      if (center_id) {
        whereCondition.center_id = center_id;
        center_data = await Center.findById(center_id);
      }

      if (data.iqa_id) {
        const assessorIQAList = await AssessorIQA.findAll({
          where: { iqa_id: data.iqa_id },
          attributes: ["assessor_id"],
        });
        const assessorIds = assessorIQAList.map((item) => item.assessor_id);
        whereCondition.id = { [Op.in]: assessorIds };
      }

      // Qualification Management
      let qualificationRequired = false;
      let qualificationWhereCondition: any = {
        deletedAt: null,
      };
      if (data?.user_id) {
        qualificationWhereCondition.user_id = data.user_id;
        qualificationRequired = true;
      }
      if (data?.qualification_ids) {
        qualificationWhereCondition.id = {
          [Op.in]: data.qualification_ids
            .split(",")
            .map((id) => parseInt(id.trim())),
        };
        qualificationRequired = true;
      }

      let search = data?.search || "";

      let searchOptions = {};
      if (search) {
        let cleanSearch = search.replace(/\D/g, "");
        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
            { phone_code: { [Op.like]: `%${search}%` } },
            Sequelize.literal(
              `CONCAT(User.name, ' ', User.surname) LIKE '%${search}%'`
            ),
            Sequelize.literal(
              `CONCAT(User.phone_code, ' ', User.phone_number) LIKE '%${search}%'`
            ),
            // // Search for phone number without country code
            // Sequelize.literal(`User.phone_number LIKE '%${cleanSearch}%'`),
            // Search for concatenated phone code and number without space
            Sequelize.literal(
              `CONCAT(User.phone_code, User.phone_number) LIKE '%${search}%'`
            ),
            // // Search for concatenated phone code and number with space
            // Sequelize.literal(`CONCAT(User.phone_code, ' ', User.phone_number) LIKE '%${search}%'`),
            // // Search for phone number with country code (digits only)
            // Sequelize.literal(`CONCAT(REPLACE(User.phone_code, '+', ''), User.phone_number) LIKE '%${cleanSearch}%'`),
          ],
        };
      }
      let assessorRequired = false;
      let throughWhere: any = {};
      if (data.learner_id) {
        assessorRequired = true;
        throughWhere.user_id = data.learner_id;
      }

      let userData_ = await User.findAndCountAll({
        where: {
          ...searchOptions,
          ...whereCondition,
        },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            required: qualificationRequired,
            where: qualificationWhereCondition,
            through: { attributes: [] }, // prevent including join table info
          },
          {
            model: User,
            as: "learner",
            required: assessorRequired,
            through: {
              attributes: [],
              where: throughWhere,
            },
          },
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });
      userData_ = JSON.parse(JSON.stringify(userData_));
      const pagination = await paginate(userData_, limit, page, fetchAll);
      const response = {
        data: userData_.rows,
        pagination: pagination,
        center_data: center_data
          ? {
              id: center_data.id,
              center_name: center_data.center_name,
              center_address: center_data.center_address,
            }
          : {},
      };
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Assessor List fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Assessor
  static async deleteAssessor(
    assessorId: number | string,
    userData: userAuthenticationData
  ) {
    try {
      let assessorData = await User.findOne({
        where: { id: assessorId, deletedAt: null, role: Roles.ASSESSOR },
        attributes: ["id"],
      });
      if (!assessorData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Assessor not found",
        };
      }
      let deleteAssessor = await User.destroy({
        where: { id: assessorId },
        force: true,
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: assessorId },
        force: true,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Assessor deleted successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  static async getRemainingIQAAssociateList(
    data: any,
    userData: userAuthenticationData
  ) {
    try {
      let qualificationIds = data.qualification_ids
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter(Boolean);
      if (qualificationIds.length === 0) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification IDs are required",
        };
      }
      let centerId = data.center_id ? data.center_id : userData.center_id;
      if (!centerId) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Center ID is required",
        };
      }
      let assessorList = await User.findAll({
        where: {
          center_id: centerId,
          role: Roles.ASSESSOR,
          deletedAt: null,
        },
      });
      if (assessorList.length === 0) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: [],
          message: "No assessor found",
        };
      }
      let assessorIds = assessorList.map((assessor) => assessor.id);
      let userQualificationData = await UserQualification.findAll({
        where: {
          qualification_id: { [Op.in]: qualificationIds },
          user_id: { [Op.in]: assessorIds },
        },
        attributes: ["user_id", "qualification_id"],
      });
      if (userQualificationData.length === 0) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: [],
          message: "No user qualification found",
        };
      }
      
      // Group by user_id and count qualifications to find assessors who have ALL qualifications (AND condition)
      const assessorQualificationMap = new Map<number, Set<number>>();
      userQualificationData.forEach((uq) => {
        const userId = uq.user_id;
        if (!assessorQualificationMap.has(userId)) {
          assessorQualificationMap.set(userId, new Set());
        }
        assessorQualificationMap.get(userId)!.add(uq.qualification_id);
      });
      
      // Only include assessors who have ALL requested qualifications
      let remainingAssessorIds = Array.from(assessorQualificationMap.entries())
        .filter(([userId, qualSet]) => {
          // Check if this assessor has ALL the requested qualifications
          return qualificationIds.every((qid) => qualSet.has(qid));
        })
        .map(([userId]) => userId);
      
      if (remainingAssessorIds.length === 0) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: [],
          message: "No assessor found with all requested qualifications",
        };
      }
      
      // Get assessors which are already associated with IQA for these qualifications
      // Exclude assessors if ANY of the requested qualifications overlap with their existing IQA assignment
      let associatedAssessorIQAData = await AssessorIQA.findAll({
        where: {
          assessor_id: { [Op.in]: remainingAssessorIds },
          deletedAt: null,
        },
        attributes: ["assessor_id", "qualification_ids"],
      });
      
      // Filter assessors whose qualification_ids contain ANY of the requested qualificationIds
      // If an assessor is already assigned with any of the requested qualifications, exclude them
      let associatedAssessorIds: number[] = [];
      associatedAssessorIQAData.forEach((assessorIQA) => {
        const assessorQualificationIds = assessorIQA.qualification_ids || [];
        // Check if ANY of the requested qualification IDs exist in this assessor's qualification_ids
        const hasAnyQualification = qualificationIds.some((qid) =>
          assessorQualificationIds.includes(qid)
        );
        if (hasAnyQualification) {
          associatedAssessorIds.push(assessorIQA.assessor_id);
        }
      });
      
      // Get remaining assessors (those not associated with IQA for these qualifications)
      // If no assessors are associated, return all assessors with these qualifications
      let finalAssessorIds = remainingAssessorIds.filter(
        (id) => !associatedAssessorIds.includes(id)
      );
      
      let remainingAssessorList = await User.findAll({
        where: {
          id: { [Op.in]: finalAssessorIds },
        },
        attributes: ["id", "name", "surname"],
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: remainingAssessorList,
        message: "Remaining IQA Associate List fetched successfully",
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

export default AssessorService;
