import { userAuthenticationData } from "../../interface/user";
import Sampling from "../../database/schema/sampling";
import {
  Entity,
  EntityType,
  STATUS_CODES,
  STATUS_MESSAGE,
} from "../../configs/constants";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { centerId, deleteFileOnAWS, paginate, uploadFileOnAWS } from "../../helper/utils";
import Image from "../../database/schema/images";
import SamplingUnits from "../../database/schema/sampling_units";
import SamplingAssessments from "../../database/schema/sampling_assessments";
import Units from "../../database/schema/units";
import Assessment from "../../database/schema/assessment";
import { Order } from "sequelize";
import User from "../../database/schema/user";
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
      data.reference_type = data.unit_ids ? 1 : data.assessment_ids ? 2 : null
      data.created_by = userData.id
      data.center_id = userData.center_id
      let createSampling = await Sampling.create(data, { transaction });
      // Create Sampling Units
      if (data.unit_ids) {
        const unitIds = data.unit_ids
          .toString()
          .split(',')
          .map(id => id.trim())
          .filter(id => id); // remove empty strings

        for (const unitId of unitIds) {
          await SamplingUnits.create(
            { sampling_id: createSampling.id, unit_id: unitId },
            { transaction }
          );
        }
      }
      // Create Sampling Assessments
      if (data.assessment_ids) {
        const assessmentIds = data.assessment_ids
          .toString()
          .split(',')
          .map(id => id.trim())
          .filter(id => id); // remove empty strings

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
        data.reference_type = 1
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
        data.reference_type = 2
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
      await SamplingUnits.destroy({ where: { sampling_id: id }, force: true, transaction });
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
      let sampling = await Sampling.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "learner",
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
            where: {
              entity_type: Entity.SAMPLING,
            },
          },
        ],
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: sampling,
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
  static async listSampling(data: any, userData: userAuthenticationData): Promise<any> {
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
        // center_id: userData.center_id,
      };
      let sampling = await Sampling.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "learner",
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
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });
      sampling = JSON.parse(JSON.stringify(sampling));
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
}

export default SamplingService;
