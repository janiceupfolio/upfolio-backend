require("dotenv").config();
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { col, fn, Op, Order, Sequelize, where } from "sequelize";
import { paginate, generateSecurePassword, centerId } from "../../helper/utils";
import { emailService } from "../../helper/emailService";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import Center from "../../database/schema/center";
import { userAuthenticationData } from "../../interface/user";
const { sequelize } = require("../../configs/database");

class CenterAdminService {
  static async createCenterAdmin(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Remove id field if it's null, undefined, empty string, or 0 to prevent database error
      // @ts-ignore
      if (
        data.id === null ||
        data.id === undefined ||
        data.id === 0 ||
        data.id === ""
      ) {
        delete data.id;
      }
      // check if center id is valid
      let center = await Center.findByPk(data.center_id);
      if (!center) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Center not found",
        };
      }
      // check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          deletedAt: null,
        },
        attributes: ["id"],
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      data.role = Roles.ADMIN;
      data.center_id = data.center_id;
      data.password = await generateSecurePassword();
      let createUser = await User.create(data, { transaction });
      // Send Email to Center Admin
      await emailService.sendCenterAdminAccountEmail(
        createUser.name,
        createUser.email,
        data.password,
        center.center_name
      );
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: createUser,
        message: "Center admin created successfully",
      };
    } catch (error) {
      console.log("Error:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  static async updateCenterAdmin(
    centerAdminId: string | number,
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      let centerAdmin = await User.findByPk(centerAdminId);
      if (!centerAdmin) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Center admin not found",
        };
      }
      // check if center id is valid
      let center = await Center.findByPk(data.center_id);
      if (!center) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Center not found",
        };
      }
      // check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: centerAdminId },
          deletedAt: null,
        },
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      await User.update(data, {
        where: { id: centerAdminId },
        transaction,
      });
      if (data.email && centerAdmin.email !== data.email) {
        let password = await generateSecurePassword();
        await User.update(
          { password: password },
          { where: { id: centerAdminId }, transaction }
        );
        await emailService.sendCenterAdminAccountEmail(
          data.name,
          data.email,
          password,
          center.center_name
        );
      }
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: centerAdmin,
        message: "Center admin updated successfully",
      };
    } catch (error) {
      console.log("Error:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  static async deleteCenterAdmin(
    centerAdminId: string | number,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      let centerAdmin = await User.findByPk(centerAdminId);
      if (!centerAdmin) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Center admin not found",
        };
      }
      // check if center admin is last admin of the center if yes then return error
      let centerAdmins = await User.findAll({
        where: { center_id: centerAdmin.center_id, deletedAt: null },
        attributes: ["id"],
      });
      if (centerAdmins.length === 1) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message:
            "Center admin is the last admin of the center, please assign a new admin first",
        };
      }
      // delete center admin
      await User.destroy({
        where: { id: centerAdminId },
        force: true,
      });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Center admin deleted successfully",
      };
    } catch (error) {
      console.log("Error:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  static async listCenterAdmins(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      let centerAdmins = await User.findAll({
        where: { center_id: data.center_id, deletedAt: null },
        // include: [
        //   {
        //     model: Center,
        //     as: "center",
        //     required: true,
        //     attributes: ["id", "center_name", "center_address"],
        //   },
        // ],
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: centerAdmins,
        message: "Center admins fetched successfully",
      };
    } catch (error) {
      console.log("Error:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default CenterAdminService;
