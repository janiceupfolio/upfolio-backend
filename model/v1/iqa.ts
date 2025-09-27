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
const { sequelize } = require("../../configs/database");

class IQAService {
  // Create IQA
  static async createIQA(
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
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
      // Send Email to Learner
      // await emailService.sendLearnerAccountEmail(
      //   createUser.name,
      //   createUser.email,
      //   data.password // Use the original password before hashing
      // );
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
    data: UserInterface,
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
      let sort_order = data?.sort_order || "ASC";
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
        message: "Learner List fetched successfully",
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
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: id },
        force: true,
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
}

export default IQAService;
