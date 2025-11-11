require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize, where } from "sequelize";
import { paginate, generateSecurePassword, centerId } from "../../helper/utils";
import { emailService } from "../../helper/emailService";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import Center from "../../database/schema/center";
import UserAssessor from "../../database/schema/user_assessor";
import UserIQA from "../../database/schema/user_iqa";
import UserUnits from "../../database/schema/user_units";
import Units from "../../database/schema/units";
import Category from "../../database/schema/category";
import qualificationService from "./qualifications";
const { sequelize } = require("../../configs/database");

class LearnerService {
  // Create Learner
  static async createLearner(
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
              role: Roles.LEARNER,
              center_id: userData.center_id,
            },
            {
              center_id: { [Op.ne]: userData.center_id },
            },
          ],
        },
        attributes: ["id"],
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used in another center",
        };
      }
      data.role = Roles.LEARNER;
      data.center_id = userData.center_id;
      // Generate Secure Password
      data.password = await generateSecurePassword();
      // Calculate license year expiry
      data.license_year = data.license_year || 3;
      if (data.license_year) {
        let expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + data.license_year);
        // Format yyyy-mm-dd
        data.license_year_expiry = expiryDate.toISOString().split("T")[0];
      }
      let createUser = await User.create(data, { transaction });
      // Create Qualification of Learner
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
      // Check if qualification is already assigned to the learner
      let isQualificationAssigned = await UserQualification.findOne({
        where: {
          user_id: createUser.id,
          qualification_id: { [Op.in]: qualificationIds },
        },
      });
      if (isQualificationAssigned) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification already assigned to the learner",
        };
      }
      await UserQualification.bulkCreate(
        qualificationIds.map((qid) => ({
          user_id: createUser.id,
          qualification_id: qid,
        })),
        { transaction }
      );
      // Find All units which are assigned to qualification
      const units_ = await Units.findAll({
        where: {
          qualification_id: { [Op.in]: qualificationIds },
        },
      });
      const categoryIds = units_.map((unit) => unit.category_id);
      const validCategories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
        attributes: ["id", "is_mandatory"],
      });
      const categoryMap: Record<number, boolean> = validCategories.reduce(
        (acc, category) => {
          acc[category.id] = category.is_mandatory;
          return acc;
        },
        {}
      );
      // Associate Learner with Units
      await UserUnits.bulkCreate(
        units_.map((unit) => ({
          user_id: createUser.id,
          unit_id: unit.id,
          is_assigned: !!categoryMap[unit.category_id] || false,
        })),
        { transaction }
      );
      const optionalQualificationIds = qualificationIds.filter((qid) => {
        const qUnits = units_.filter((u) => u.qualification_id === qid);
        return (
          qUnits.length > 0 &&
          qUnits.every((unit) => !!categoryMap[unit.category_id])
        );
      });

      if (optionalQualificationIds.length > 0) {
        await UserQualification.update(
          { is_optional_assigned: true },
          {
            where: {
              user_id: createUser.id,
              qualification_id: { [Op.in]: optionalQualificationIds },
            },
            transaction,
          }
        );
      }
      // Send Email to Learner
      await emailService.sendLearnerAccountEmail(
        createUser.name,
        createUser.email,
        data.password // Use the original password before hashing
      );
      // Associate Learner with Assessor if provided
      if (data.assessors) {
        const assessorIds = data.assessors
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate assessor IDs exist
        const validAssessors = await User.findAll({
          where: {
            id: { [Op.in]: assessorIds },
            role: Roles.ASSESSOR,
            deletedAt: null,
          },
        });
        if (validAssessors.length !== assessorIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some assessors are invalid",
          };
        }
        await UserAssessor.bulkCreate(
          assessorIds.map((assessorId) => ({
            user_id: createUser.id,
            assessor_id: assessorId,
          })),
          { transaction }
        );
      }
      // Associate Learner with IQA if provided
      if (data.iqas) {
        const iqaIds = data.iqas
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate IQA IDs exist
        const validIQAs = await User.findAll({
          where: {
            id: { [Op.in]: iqaIds },
            role: Roles.IQA,
            deletedAt: null,
          },
        });
        if (validIQAs.length !== iqaIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some IQAs are invalid",
          };
        }
        await UserIQA.bulkCreate(
          iqaIds.map((iqaId) => ({
            user_id: createUser.id,
            iqa_id: iqaId,
          })),
          { transaction }
        );
      }
      await transaction.commit();
      return {
        data: createUser,
        message: "Learner Created Successfully",
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

  // Update Learner
  static async updateLearner(
    learnerId: number | string,
    data: UserInterface,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check is valid user
      let isValidUser = await User.findOne({
        where: { id: learnerId, deletedAt: null },
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
          id: { [Op.ne]: learnerId },
          deletedAt: null,
          [Op.or]: [
            {
              role: Roles.LEARNER,
              center_id: userData.center_id,
            },
            {
              center_id: { [Op.ne]: userData.center_id },
            },
          ],
        },
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used in another center",
        };
      }
      data.center_id = userData.center_id;
      if (data.license_year) {
        let expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + data.license_year);
        // Format yyyy-mm-dd
        data.license_year_expiry = expiryDate.toISOString().split("T")[0];
      }
      // Update user data
      await User.update(data, {
        where: { id: learnerId },
        transaction,
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
        // Check if qualification is already assigned to the learner
        let isQualificationAssigned = await UserQualification.findOne({
          where: {
            user_id: learnerId,
            qualification_id: { [Op.in]: qualificationIds },
          },
        });
        if (isQualificationAssigned) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Qualification already assigned to the learner",
          };
        }
        // Remove old qualifications
        await UserQualification.destroy({
          where: { user_id: learnerId },
          force: true,
          transaction,
        });

        // Insert updated qualifications
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: +learnerId,
            qualification_id: qid,
          })),
          { transaction }
        );

        // Delete old units
        await UserUnits.destroy({
          where: { user_id: learnerId },
          force: true,
          transaction,
        });
        // Find All units which are assigned to qualification
        const units_ = await Units.findAll({
          where: {
            qualification_id: { [Op.in]: qualificationIds },
          },
        });
        const categoryIds = units_.map((unit) => unit.category_id);
        const validCategories = await Category.findAll({
          where: { id: { [Op.in]: categoryIds } },
          attributes: ["id", "is_mandatory"],
        });
        const categoryMap: Record<number, boolean> = validCategories.reduce(
          (acc, category) => {
            acc[category.id] = category.is_mandatory;
            return acc;
          }, {}
        );
        // Update units
        await UserUnits.bulkCreate(
          units_.map((unit) => ({
            user_id: +learnerId,
            unit_id: unit.id,
            is_assigned: !!categoryMap[unit.category_id] || false,
          })),
          { transaction }
        );
        // Update optional qualifications
        const optionalQualificationIds = qualificationIds.filter((qid) => {
          const qUnits = units_.filter((u) => u.qualification_id === qid);
          return (
            qUnits.length > 0 &&
            qUnits.every((unit) => !!categoryMap[unit.category_id])
          );
        });
        if (optionalQualificationIds.length > 0) {
          await UserQualification.update(
            { is_optional_assigned: true },
            { where: { user_id: learnerId, qualification_id: { [Op.in]: optionalQualificationIds } }, transaction }
          );
        }
      }

      // Update Assessor associations if provided
      if (data.assessors) {
        const assessorIds = data.assessors
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate assessor IDs exist
        const validAssessors = await User.findAll({
          where: {
            id: { [Op.in]: assessorIds },
            role: Roles.ASSESSOR,
            deletedAt: null,
          },
        });
        if (validAssessors.length !== assessorIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some assessors are invalid",
          };
        }
        // Remove old assessor associations
        await UserAssessor.destroy({
          where: { user_id: learnerId },
          force: true,
          transaction,
        });
        // Insert updated assessor associations
        await UserAssessor.bulkCreate(
          assessorIds.map((assessorId) => ({
            user_id: +learnerId,
            assessor_id: assessorId,
          })),
          { transaction }
        );
      }

      // Update IQA associations if provided
      if (data.iqas) {
        const iqaIds = data.iqas
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate IQA IDs exist
        const validIQAs = await User.findAll({
          where: {
            id: { [Op.in]: iqaIds },
            role: Roles.IQA,
            deletedAt: null,
          },
        });
        if (validIQAs.length !== iqaIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some IQAs are invalid",
          };
        }
        // Remove old IQA associations
        await UserIQA.destroy({
          where: { user_id: learnerId },
          force: true,
          transaction,
        });
        // Insert updated IQA associations
        await UserIQA.bulkCreate(
          iqaIds.map((iqaId) => ({
            user_id: +learnerId,
            iqa_id: iqaId,
          })),
          { transaction }
        );
      }
      if (data.email && isValidUser.email !== data.email) {
        let password = await generateSecurePassword();
        await User.update(
          { password: password },
          { where: { id: isValidUser.id }, transaction }
        );
        // Send Email to Learner
        await emailService.sendLearnerAccountEmail(
          data.name,
          data.email,
          password
        );
      }
      await transaction.commit();
      return {
        data: {},
        status: STATUS_CODES.SUCCESS,
        message: "Learner Updated Successfully",
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

  // List Learner
  static async listLearner(data, userData: userAuthenticationData) {
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
        role: Roles.LEARNER,
      };

      // Filter by center_id if provided
      let center_id = data?.center_id
        ? data.center_id
        : await centerId(userData);
      let center_data;
      if (center_id) {
        whereCondition.center_id = center_id;
        center_data = await Center.findById(center_id);
      }

      // Qualification Ids where condition
      let whereConditionQualification: any = {
        deletedAt: null,
      };
      let qualificationRequired = false;
      if (data.qualification_id) {
        // Convert comma-separated IDs into an array of numbers
        const qualificationIds = data.qualification_id
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id));

        if (qualificationIds.length > 0) {
          whereConditionQualification.id = { [Op.in]: qualificationIds };
          qualificationRequired = true;
        }
      }

      // Where include condition
      let whereConditionInclude: any = {
        deletedAt: null,
      };
      // let includeRequired = false;
      let includeRequiredAssessor = false;
      let includeRequiredIqa = false;

      // Qualification Management
      if (data?.user_id) {
        whereConditionQualification.user_id = data.user_id;
        qualificationRequired = true;
        whereConditionInclude.id = data.user_id;
        includeRequiredAssessor = true;
        includeRequiredIqa = true;
      }

      if (data.iqa_id) {
        whereConditionInclude.id = data.iqa_id;
        includeRequiredIqa = true;
      }

      let search = data?.search || "";
      let searchOptions = {};
      if (search) {
        // Remove any non-digit characters from search for phone number matching
        let cleanSearch = search.replace(/\D/g, "");

        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
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

      // Check if logged in user is assessor then only assigned learner will show
      let isAssessor = await User.findOne({
        where: { id: userData.id, role: Roles.ASSESSOR, deletedAt: null },
      });

      // through where condition
      let throughWhere: any = {};
      if (data.is_signed_off) {
        throughWhere.is_signed_off = data.is_signed_off;
      }
      if (data.is_optional_assigned) {
        throughWhere.is_optional_assigned = data.is_optional_assigned;
      }

      let include = [
        {
          model: Qualifications,
          as: "qualifications",
          where: whereConditionQualification,
          required: qualificationRequired,
          through: {
            attributes: ["is_signed_off", "is_optional_assigned"],
            where: throughWhere,
          }, // prevent including join table info
        },
        {
          model: User,
          as: "iqas",
          through: { attributes: [] },
          where: whereConditionInclude,
          required: includeRequiredIqa,
        },
        {
          model: Center,
          as: "center",
          attributes: ["id", "center_name", "center_address"],
        },
      ];

      if (isAssessor) {
        // Use the correct column name (user_id) instead of learner_id
        whereCondition.id = {
          [Op.in]: Sequelize.literal(`(
            SELECT user_id
            FROM tbl_user_assessor
            WHERE assessor_id = ${userData.id}
          )`),
        };
      } else {
        include.push({
          model: User,
          as: "assessors",
          through: { attributes: [] },
          where: whereConditionInclude,
          required: includeRequiredAssessor,
        });
      }
      let userData_ = await User.findAndCountAll({
        where: {
          ...searchOptions,
          ...whereCondition,
        },
        include: include,
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });
      userData_ = JSON.parse(JSON.stringify(userData_));
      // Flatten qualifications with Promise.all
      if (userData_ && userData_.rows?.length) {
        userData_.rows = await Promise.all(
          userData_.rows.map(async (user: any) => {
            if (user.qualifications?.length) {
              user.qualifications = await Promise.all(
                user.qualifications.map(async (q: any) => {
                  const { tbl_user_qualification, ...rest } = q; // remove join object
                  return {
                    ...rest,
                    is_signed_off:
                      tbl_user_qualification?.is_signed_off ?? null,
                    is_optional_assigned:
                      tbl_user_qualification?.is_optional_assigned ?? null,
                  };
                })
              );
            }
            return user;
          })
        );
      }
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

  // Detail Learner
  static async detailLearner(
    learnerId: number | string,
    userData: userAuthenticationData
  ) {
    try {
      // Check if learner exists
      let isValidUser = await User.findOne({
        where: { id: learnerId, deletedAt: null, role: Roles.LEARNER },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            required: false,
            through: { attributes: ["is_signed_off", "is_optional_assigned"] }, // prevent including join table info
          },
          {
            model: User,
            as: "assessors",
            required: false,
            through: { attributes: [] },
          },
          {
            model: User,
            as: "iqas",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Center,
            as: "center",
            required: false,
            attributes: ["id", "center_name", "center_address"],
          },
        ],
      });
      isValidUser = JSON.parse(JSON.stringify(isValidUser));
      //@ts-ignore
      if (isValidUser && isValidUser.qualifications?.length) {
        //@ts-ignore
        isValidUser.qualifications = await Promise.all(
          //@ts-ignore
          isValidUser.qualifications.map(async (q: any) => {
            const { tbl_user_qualification, UserQualification, ...rest } = q; // strip join table objects
            return {
              ...rest,
              is_signed_off:
                tbl_user_qualification?.is_signed_off ??
                UserQualification?.is_signed_off ??
                null,
              is_optional_assigned:
                tbl_user_qualification?.is_optional_assigned ??
                UserQualification?.is_optional_assigned ??
                null,
            };
          })
        );
      }
      return {
        status: STATUS_CODES.SUCCESS,
        data: isValidUser,
        message: "Learner detail fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Learner
  static async deleteLearner(
    learnerId: number | string,
    userData: userAuthenticationData
  ) {
    try {
      let learnerData = await User.findOne({
        where: { id: learnerId, deletedAt: null, role: Roles.LEARNER },
        attributes: ["id"],
      });
      if (!learnerData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Learner not found",
        };
      }
      let deleteLearner = await User.destroy({
        where: { id: learnerId },
        force: true,
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: learnerId },
        force: true,
      });
      let deleteUserUnits = await UserUnits.destroy({
        where: { user_id: learnerId },
        force: true,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Learner deleted successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Assign Status Learner
  static async assignStatusLearner(
    learnerId: number | string,
    data: any,
    userData: userAuthenticationData
  ) {
    try {
      let learnerData = await User.findOne({
        where: { id: learnerId, deletedAt: null, role: Roles.LEARNER },
      });
      if (!learnerData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Learner not found",
        };
      }
      // Unit ids came in comma separated string and some time it come "" or null as well
      let unitIds = data.unit_ids.split(",").map((id) => id.trim()).filter((id) => id !== "" && !isNaN(id)).map((id) => parseInt(id));
      if (unitIds.length > 0) {
        await UserUnits.update(
          { is_assigned: true },
          { where: { user_id: learnerId, unit_id: { [Op.in]: unitIds } } }
        );
      }
      let qualificationIds = data.qualification_ids.split(",").map((id) => id.trim()).filter((id) => id !== "" && !isNaN(id)).map((id) => parseInt(id));
      if (qualificationIds.length > 0) {
        await UserQualification.update(
          { is_optional_assigned: data.is_optional_assigned },
          { where: { user_id: learnerId, qualification_id: { [Op.in]: qualificationIds } } }
        );
      }
      // is_not_assign_unit handle 
      let notAssignUnit = data.is_not_assign_unit.split(",").map((id) => id.trim()).filter((id) => id !== "" && !isNaN(id)).map((id) => parseInt(id));
      if (notAssignUnit.length > 0) {
        await UserUnits.update(
          { is_assigned: false },
          { where: { user_id: learnerId, unit_id: { [Op.in]: notAssignUnit } } }
        )
      }
      let response = await qualificationService.getCategoryByQualification(
        { categorywise_unit_data: 1 },
        qualificationIds[0],
        userData,
        learnerId
      )
      let response_ = {}
      if (response.data && response.status == 200) {
        response_ = response.data
      }
      return {
        status: STATUS_CODES.SUCCESS,
        data: response_,
        message: "Status updated successfully",
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

export default LearnerService;
