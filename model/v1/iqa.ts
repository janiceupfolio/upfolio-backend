require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { centerId, generateSecurePassword, paginate } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import Center from "../../database/schema/center";
import AssessorIQA from "../../database/schema/assessor_iqa";
const { sequelize } = require("../../configs/database");

class IQAService {
  // Create IQA
  static async createIQA(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // @ts-ignore
      if (data.id === null || data.id === undefined || data.id === 0 || data.id === '') {
        delete data.id;
      }
      // Check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          deletedAt: null,
          [Op.or]: [
            {
              role: Roles.IQA,
              center_id: userData.center_id
            },
            {
              center_id: { [Op.ne]: userData.center_id },
            }
          ]
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
      data.role = Roles.IQA;
      // Generate Secure Password
      data.password = await generateSecurePassword();
      data.center_id = userData.center_id;
      let createUser = await User.create(data, { transaction });
      // Create Qualification of Learner
      if (data.qualifications) {
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
          })),
          { transaction }
        );
      }
      // ✅ Handle Assessor-IQA associations (merge qualifications by assessor)
      if (typeof data.assessor_association === 'string') {
        data.assessor_association = JSON.parse(data.assessor_association);
      }
      if (Array.isArray(data.assessor_association) && data.assessor_association.length > 0) {
        // Group by assessor_id
        const assessorMap: Record<number, number[]> = {};

        for (const assoc of data.assessor_association) {
          const assessorId = assoc.assessor_id;
          const qualificationId = assoc.qualification_id;

          if (!assessorMap[assessorId]) {
            assessorMap[assessorId] = [];
          }

          assessorMap[assessorId].push(qualificationId);
        }

        // Convert to array of records for bulk insert
        const associations = Object.entries(assessorMap).map(([assessorId, qualificationIds]) => ({
          assessor_id: parseInt(assessorId),
          iqa_id: createUser.id,
          qualification_ids: qualificationIds,
          status: 1, // active/pending etc.
        }));
        console.log(associations)
        await AssessorIQA.bulkCreate(associations, { transaction });
      }
      // Send Email to IQA
      await emailService.sendIQAAccountEmail(
        createUser.name,
        createUser.email,
        data.password // Use the original password before hashing
      );
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: createUser,
        message: "IQA created successfully",
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
  // Update IQA
  static async updateIQA(
    id: string | number,
    data: any,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check if IQA exists
      let isIQA = await User.findOne({
        where: { id, role: Roles.IQA, deletedAt: null },
        attributes: ["id"],
      });
      if (!isIQA) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "IQA not found",
        };
      }
      // Update IQA data
      data.center_id = userData.center_id;
      await User.update(data, { where: { id }, transaction });
      if (data.qualifications) {
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
        // Update User Qualifications
        await UserQualification.destroy({
          where: { user_id: id },
          force: true, // Ensure qualifications are removed before adding new ones
          transaction,
        });
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: isIQA.id,
            qualification_id: qid,
          })),
          { transaction }
        );
      }
      // ✅ Handle Assessor-IQA associations (merge qualifications by assessor)
      if (typeof data.assessor_association === 'string') {
        data.assessor_association = JSON.parse(data.assessor_association);
      }
      // ✅ Handle Assessor-IQA Associations
      if (Array.isArray(data.assessor_association) && data.assessor_association.length > 0) {
        // Group by assessor_id and merge qualifications
        const assessorMap: Record<number, number[]> = {};

        for (const assoc of data.assessor_association) {
          const assessorId = assoc.assessor_id;
          const qualificationId = assoc.qualification_id;

          if (!assessorMap[assessorId]) {
            assessorMap[assessorId] = [];
          }

          assessorMap[assessorId].push(qualificationId);
        }

        // Delete old associations for this IQA
        await AssessorIQA.destroy({
          where: { iqa_id: id },
          force: true,
          transaction,
        });

        // Create new merged associations
        const newAssociations = Object.entries(assessorMap).map(
          ([assessorId, qualificationIds]) => ({
            assessor_id: parseInt(assessorId),
            iqa_id: Number(id),
            qualification_ids: qualificationIds,
            status: 1,
          })
        );

        await AssessorIQA.bulkCreate(newAssociations, { transaction });
      }
      if (data.email && isIQA.email !== data.email) {
        let password = await generateSecurePassword();
        await User.update({ password: password }, { where: { id: isIQA.id }, transaction })
        // Send Email to IQA
        await emailService.sendIQAAccountEmail(
          data.name,
          data.email,
          password
        );
      }
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "IQA updated successfully",
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

  // List IQA
  static async listIQA(data: any, userData: userAuthenticationData) {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "DESC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      // Where condition
      let whereCondition: any = {
        deletedAt: null,
        role: Roles.IQA,
      };
      // If center_id is provided, filter by center
      let center_id = data.center_id
        ? data.center_id
        : await centerId(userData);
      let center_data;
      if (center_id) {
        whereCondition.center_id = center_id;
        center_data = await Center.findById(center_id);
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
          [Op.in]: data.qualification_ids.split(",").map((id) => parseInt(id.trim())),
        };
        qualificationRequired = true;
      }

      let search = data?.search || "";
      let searchOptions = {};
      if (search) {
        let cleanSearch = search.replace(/\D/g, '');
        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
            { phone_code: { [Op.like]: `%${search}%` } },
            Sequelize.literal(`CONCAT(User.name, ' ', User.surname) LIKE '%${search}%'`),
            Sequelize.literal(`CONCAT(User.phone_code, ' ', User.phone_number) LIKE '%${search}%'`),
            // // Search for phone number without country code
            // Sequelize.literal(`User.phone_number LIKE '%${cleanSearch}%'`),
            // Search for concatenated phone code and number without space
            Sequelize.literal(`CONCAT(User.phone_code, User.phone_number) LIKE '%${search}%'`),
            // // Search for concatenated phone code and number with space
            // Sequelize.literal(`CONCAT(User.phone_code, ' ', User.phone_number) LIKE '%${search}%'`),
            // // Search for phone number with country code (digits only)
            // Sequelize.literal(`CONCAT(REPLACE(User.phone_code, '+', ''), User.phone_number) LIKE '%${cleanSearch}%'`),
          ]
        };
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
        message: "IQA List fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete IQA
  static async deleteIQA(
    id: string | number,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check if IQA exists
      let isIQA = await User.findOne({
        where: { id, role: Roles.IQA, deletedAt: null },
        attributes: ["id"],
      });
      if (!isIQA) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "IQA not found",
        };
      }
      let deleteLearner = await User.destroy({
        where: { id },
        force: true,
        transaction,
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: id },
        force: true,
        transaction,
      });
      await AssessorIQA.destroy({
        where: { iqa_id: id },
        force: true,
        transaction,
      });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "IQA deleted successfully",
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

  // Get IQA
  static async getIQA(id, userData) {
    try {
      // 1️⃣ Find IQA user
      const iqa = await User.findOne({
        where: { id },
        attributes: [
          "id",
          "name",
          "surname",
          "phone_code",
          "phone_number",
          "email",
          "trainee",
          "additional_iqa_id"
        ]
      });

      if (!iqa) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "IQA not found",
        };
      }

      // 2️⃣ Fetch all Assessor–IQA mappings
      const assessorIQAList = await AssessorIQA.findAll({
        where: { iqa_id: iqa.id },
        attributes: ["id", "assessor_id", "qualification_ids"],
        raw: true,
      });

      const assessorAssociations = [];

      // 3️⃣ Construct detailed associations
      for (const record of assessorIQAList) {
        // Handle qualification_ids stored as JSON string
        let qualificationIds = [];
        if (typeof record.qualification_ids === "string") {
          try {
            qualificationIds = JSON.parse(record.qualification_ids);
          } catch (err) {
            console.warn("Invalid JSON in qualification_ids:", record.qualification_ids);
          }
        } else if (Array.isArray(record.qualification_ids)) {
          qualificationIds = record.qualification_ids;
        }

        if (!qualificationIds.length) continue;

        // Fetch assessor details
        const assessor = await User.findOne({
          where: { id: record.assessor_id, role: Roles.ASSESSOR, deletedAt: null },
          attributes: ["id", "name", "surname"],
          raw: true,
        });

        // Fetch qualifications
        const qualifications = await Qualifications.findAll({
          where: { id: qualificationIds },
          attributes: ["id", "name", "qualification_no"],
          raw: true,
        });

        // Combine assessor + qualification data
        for (const qualification of qualifications) {
          assessorAssociations.push({
            qualification,
            assessor,
          });
        }
      }

      // ✅ Final response
      return {
        status: STATUS_CODES.SUCCESS,
        message: "IQA detail fetched successfully",
        data: {
          ...iqa.dataValues,
          assessor_association: assessorAssociations,
        },
      };
    } catch (error) {
      console.error("getIQA Error:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

}

export default IQAService;
