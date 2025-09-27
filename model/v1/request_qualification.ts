require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { generateSecurePassword, paginate } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import Role from "../../database/schema/role";
import Center from "../../database/schema/center";
import Methods from "../../database/schema/methods";
import RequestQualification from "../../database/schema/request_qualification";
const { sequelize } = require("../../configs/database");

class RequestQualificationService {
  // Create Request Qualification
  static async createRequestQualification(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    let transaction = await sequelize.transaction();
    try {
      // check only center admin can add the Request Qualification
      let isCenterAdmin = await User.findOne({
        where: {
          id: userData.id,
          role: Roles.ADMIN,
        },
      });
      if (!isCenterAdmin) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.UNAUTHORIZED,
          message: "Only Center Admin can request the Qualification.",
        };
      }
      data.center_id = userData.center_id;
      let requestQualification = await RequestQualification.create(data, {
        transaction,
      });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: requestQualification,
        message: "Request Qualification created successfully",
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

  // Update Request Qualification
  static async updateRequestQualification(
    data: any,
    userData: userAuthenticationData,
    id: string
  ): Promise<any> {
    let transaction = await sequelize.transaction();
    try {
      // check only center admin can add the Request Qualification
      let isCenterAdmin = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.SUPER_ADMIN] },
        },
      });
      if (!isCenterAdmin) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.UNAUTHORIZED,
          message: "Only Center Admin and Super Admin can update request Qualification.",
        };
      }
      let requestQualification = await RequestQualification.findOne({
        where: {
          id,
        },
      });
      if (!requestQualification) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Request Qualification not found",
        };
      }
      await RequestQualification.update(data, {
        where: { id },
        transaction
      })
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Request Qualification updated successfully",
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

  // Delete Request Qualification
  static async deleteRequestQualification(
    id: string,
    userData: userAuthenticationData
  ): Promise<any> {
    let transaction = await sequelize.transaction();
    try {
      // check only center admin can add the Request Qualification
      let isCenterAdmin = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.SUPER_ADMIN] },
        },
      });
      if (!isCenterAdmin) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.UNAUTHORIZED,
          message: "Only Center Admin or Super Admin can delete the Request Qualification.",
        };
      }
      let requestQualification = await RequestQualification.findOne({
        where: {
          id,
        },
      });
      if (!requestQualification) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Request Qualification not found",
        };
      }
      await requestQualification.destroy({ force: true, transaction });
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Request Qualification deleted successfully",
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

  // List Request Qualification
  static async listRequestQualification(
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

      let whereCondition = {
        deletedAt: null,
      };
      let centerWhereCondition: any = {
        deletedAt: null,
      };

      // check if user is login as a center Admin then add center_id condition list API
      let isCenterAdmin = await User.findOne({
        where: {
          id: userData.id,
          role: Roles.ADMIN,
        },
      });
      if (isCenterAdmin) {
        centerWhereCondition.id = userData.center_id
      }

      let search = data?.search || "";

      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { qualification_title: { [Op.like]: `%${search}%` } },
            { qualification_number: { [Op.like]: `%${search}%` } },
            { '$center.center_name$': { [Op.like]: `%${search}%` } }
          ]
        };
      }

      let requestQualification = await RequestQualification.findAndCountAll({
        where: {
          ...searchOptions,
          ...whereCondition,
        },
        include: [
          {
            model: Center,
            as: "center",
            required: true,
            where: centerWhereCondition,
          },
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });

      const pagination = await paginate(
        requestQualification,
        limit,
        page,
        fetchAll
      );
      const response = {
        data: requestQualification.rows,
        pagination: pagination,
      };
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Request Qualification List fetched successfully",
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

export default RequestQualificationService;
