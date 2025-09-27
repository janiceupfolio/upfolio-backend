require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { col, fn, Op, Order, Sequelize, where } from "sequelize";
import { paginate, generateSecurePassword, centerId } from "../../helper/utils";
import { emailService } from "../../helper/emailService";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import Center from "../../database/schema/center";
const { sequelize } = require("../../configs/database");

class AdminService {
  // Create Admin
  static async createAdmin(
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Check if email already used
      let isEmailUsed = await User.findOne({
        where: { email: data.email, deletedAt: null },
        attributes: ["id"],
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      data.role = Roles.ADMIN;
      // Generate Secure Password
      data.password = await generateSecurePassword();
      let createUser = await User.create(data, { transaction });
      // Create Center of Admin
      if (!data.center_name) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Center name is required",
        };
      }
      // Check if center already exists
      let existingCenter = await Center.findOne({
        where: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("center_name")),
          data.center_name.trim().toLowerCase()
        ),
      });
      if (existingCenter) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Center already exists",
        };
      }
      let centerData = await Center.create(
        {
          center_name: data.center_name,
          center_admin: createUser.id,
          center_address: data.center_address
        },
        { transaction }
      );
      // update center_id in user
      await User.update(
        { center_id: centerData.id },
        { where: { id: createUser.id }, transaction }
      );
      // Create Qualification of Admin
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
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: createUser,
        message: "Admin created successfully",
      };
    } catch (error) {
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Update Admin
  static async updateAdmin(
    adminId: string | number,
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      let admin = await User.findByPk(adminId, { transaction });
      if (!admin || admin.role !== Roles.ADMIN) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Admin not found",
        };
      }
      let adminCenter = await Center.findOne({
        where: { center_admin: adminId, deletedAt: null },
        attributes: ["id", "center_name"],
      });
      // Check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: adminId },
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
        where: { id: adminId },
        transaction,
      });
      if (data.center_name) {
        // Check if center already exists
        let currentCenter = await Center.findOne({
          where: { center_name: adminCenter.center_name, deletedAt: null },
          attributes: ["id", "center_name"],
        });
        if (currentCenter && currentCenter.center_name !== data.center_name) {
          const existingCenter = await Center.findOne({
            where: {
              [Op.and]: [
                where(
                  fn("LOWER", col("center_name")),
                  data.center_name.trim().toLowerCase()
                ),
                { deletedAt: null },
                { id: { [Op.ne]: currentCenter.id } },
              ],
            },
            transaction,
          });
          if (existingCenter) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Center already exists",
            };
          }
          await Center.update(
            { center_name: data.center_name, center_address: data.center_address },
            { where: { id: currentCenter.id }, transaction }
          );
        }
        await Center.update(
          { center_address: data.center_address },
          { where: { id: currentCenter.id }, transaction }
        )
      }
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
          where: { user_id: adminId },
          force: true,
          transaction,
        });
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: admin.id,
            qualification_id: qid,
          })),
          { transaction }
        );
      }
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: admin,
        message: "Admin updated successfully",
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

  // List Admins
  static async listAdmins(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "ASC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      let search = data?.search || "";

      // Where condition
      let whereCondition: any = { deletedAt: null, role: Roles.ADMIN };
      
      // Search options for user fields and related center
      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            Sequelize.literal(`CONCAT(User.name, ' ', User.surname) LIKE '%${search}%'`),
            { '$center.center_name$': { [Op.like]: `%${search}%` } }
          ]
        };
      }

      let userData_ = await User.findAndCountAll({
        where: {
          ...whereCondition,
          ...searchOptions
        },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            through: { attributes: [] }, // prevent including join table info
          },
          {
            model: Center,
            as: "center",
            required: true,
            attributes: ["id", "center_name", "center_address"],
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
        // center_data: center_data
        //   ? {
        //       id: center_data.id,
        //       center_name: center_data.center_name,
        //       center_address: center_data.center_address,
        //     }
        //   : {},
      };
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Admin List fetched successfully",
      };
    } catch (error) {
      console.log("Error:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Delete Admin
  static async deleteAdmin(
    adminId: string | number,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      let adminData = await User.findOne({
        where: { id: adminId, deletedAt: null, role: Roles.ADMIN },
        attributes: ["id"],
      });
      if (!adminData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Admin not found",
        };
      }
      let deleteAdmin = await User.destroy({
        where: { id: adminId },
        force: true,
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: adminId },
        force: true,
      });
      let deleteCenter = await Center.destroy({
        where: { center_admin: adminId },
        force: true,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Admin deleted successfully",
      };
    } catch (error) {
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default AdminService;
