require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { centerId, generateSecurePassword, paginate } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import UserLearner from "../../database/schema/user_learner";
import Center from "../../database/schema/center";
const { sequelize } = require("../../configs/database");

class EQAService {
  // Create EQA
  static async createEQA(
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
              role: Roles.EQA, 
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
      data.role = Roles.EQA;
      data.center_id = userData.center_id;
      // Generate Secure Password
      data.password = await generateSecurePassword();
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
      // Create User Learner
      if (data.learners) {
        const learnerIds = data.learners
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate learners exist
        const validLearners = await User.findAll({
          where: { id: learnerIds, role: Roles.LEARNER, deletedAt: null },
        });
        if (validLearners.length !== learnerIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some learners are invalid",
          };
        }
        await UserLearner.bulkCreate(
          learnerIds.map((lid) => ({
            user_id: createUser.id,
            learner_id: lid,
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
        message: "EQA created successfully",
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
  // Update EQA
  static async updateEQA(
    id: string | number,
    data: UserInterface,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check if EQA exists
      let isEQA = await User.findOne({
        where: { id, role: Roles.EQA, deletedAt: null },
        attributes: ["id"],
      });
      if (!isEQA) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "EQA not found",
        };
      }
      data.center_id = userData.center_id;
      // Update EQA data
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
          force: true,
          transaction,
        });
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: isEQA.id,
            qualification_id: qid,
          })),
          { transaction }
        );
      }
      if (data.learners) {
        const learnerIds = data.learners
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate learners exist
        const validLearners = await User.findAll({
          where: { id: learnerIds, role: Roles.LEARNER, deletedAt: null },
        });
        if (validLearners.length !== learnerIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some learners are invalid",
          };
        }
        await UserLearner.destroy({
          where: { user_id: id },
          force: true,
          transaction,
        });
        await UserLearner.bulkCreate(
          learnerIds.map((lid) => ({
            user_id: isEQA.id,
            learner_id: lid,
          })),
          { transaction }
        );
      }
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "EQA updated successfully",
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

  // List EQA
  static async listEQA(data: any, userData: userAuthenticationData) {
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
        role: Roles.EQA,
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
      let includeRequired = false;
      let includeWhereCondition: any = {
        deletedAt: null,
      };
      let includeLearnerCondition: any = {
        deletedAt: null,
      };
      if (data?.user_id) {
        includeWhereCondition.user_id = data.user_id;
        includeLearnerCondition.id = data.user_id;
        includeRequired = true;
      }

      let search = data?.search || "";
      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            Sequelize.literal(`CONCAT(User.name, ' ', User.surname) LIKE '%${search}%'`),
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
            required: includeRequired,
            where: includeWhereCondition,
            through: { attributes: [] }, // prevent including join table info
          },
          {
            model: User,
            as: "learners",
            required: includeRequired,
            through: { attributes: [] }, // prevent including join table info
            where: includeLearnerCondition,
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

  // Delete EQA
  static async deleteEQA(
    id: string | number,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check if EQA exists
      let isEQA = await User.findOne({
        where: { id, role: Roles.EQA, deletedAt: null },
        attributes: ["id"],
      });
      if (!isEQA) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "EQA not found",
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
        message: "EQA deleted successfully",
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

export default EQAService;
