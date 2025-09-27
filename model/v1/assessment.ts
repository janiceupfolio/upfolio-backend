require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import {
  AssessmentStatus,
  Entity,
  EntityType,
  RoleRoleSlug,
  Roles,
  RoleSlug,
  STATUS_CODES,
  STATUS_MESSAGE,
} from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import {
  centerId,
  deleteFileOnAWS,
  generateSecurePassword,
  paginate,
  uploadFileOnAWS,
  initChunkUpload,
  uploadChunk,
  completeChunkUpload,
  abortChunkUpload,
  splitFileIntoChunks,
  activityCreate,
} from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import UserLearner from "../../database/schema/user_learner";
import Center from "../../database/schema/center";
const { sequelize } = require("../../configs/database");
import Assessment from "../../database/schema/assessment";
import Image from "../../database/schema/images";
import Units from "../../database/schema/units";
import Methods from "../../database/schema/methods";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";
import AssessmentMethod from "../../database/schema/assessment_methods";
import AssessmentUnits from "../../database/schema/assessment_units";
import AssessmentLearner from "../../database/schema/assessment_learners";
import AssessmentNotes from "../../database/schema/assessment_notes";
import AssessmentNoteFiles from "../../database/schema/assessment_note_files";
import AssessmentMarks from "../../database/schema/assessment_marks";
import SubOutcomes from "../../database/schema/sub_outcomes";
import OutcomeSubpoints from "../../database/schema/outcome_subpoints";
import { ActivityInterface } from "../../interface/activity";
import Role from "../../database/schema/role";

class AssessmentService {
  /**
   * Helper function to determine workflow phase based on assessment status and user role
   * Workflow Phase Logic:
   * - Phase 0: Initial assessment creation, assessor completion, assessor rejection
   * - Phase 1: IQA disagreement, assessor response to IQA disagreement
   *
   * @param assessmentStatus - Current assessment status
   * @param userRole - Role of the user creating/updating the note
   * @param previousStatus - Previous assessment status (for context)
   * @returns workflow phase number (0 or 1)
   */
  static getWorkflowPhase(
    assessmentStatus: number,
    userRole: number,
    previousStatus?: number
  ): number {
    // IQA disagreed with comment = stage - 1 - status - 5
    if (
      +assessmentStatus === +AssessmentStatus.NOT_AGREED_BY_IQA &&
      +userRole === +Roles.IQA
    ) {
      return 1;
    }
    // Assessor comment and completed = stage - 1 - check if old status is 5 then stage set to 1 and it's assessor - status - 4
    if (
      +assessmentStatus === +AssessmentStatus.ASSESSMENT_COMPLETED &&
      +userRole === +Roles.ASSESSOR &&
      +previousStatus === +AssessmentStatus.NOT_AGREED_BY_IQA
    ) {
      return 1;
    }
    // Default workflow phase for initial creation and other cases
    return 0;
  }

  // Create Assessment
  static async createAssessment(
    data: any,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      if ("id" in data) {
        delete data.id;
      }
      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.ASSESSOR, Roles.IQA] },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins, Assessors and IQA are allowed to create assessments.",
        };
      }
      data.assessor_id = userData_.id;
      data.center_id = userData_.center_id;
      data.assessment_status = AssessmentStatus.ASSESSMENT_CREATE;
      // Create Assessment
      let assessment = await Assessment.create(data, { transaction });

      // Create Assessment Methods
      if (data.method_ids) {
        try {
          const methodsIds = data.method_ids
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate methods exist
          const validMethods = await Methods.findAll({
            where: { id: methodsIds, deletedAt: null },
          });

          if (validMethods.length !== methodsIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some methods are invalid",
            };
          }

          await AssessmentMethod.bulkCreate(
            methodsIds.map((mid) => ({
              assessment_id: assessment.id,
              method_id: mid,
            })),
            { transaction }
          );
        } catch (methodError) {
          console.error("Error creating assessment methods:", methodError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment methods",
          };
        }
      }

      // Create Assessment Units
      if (data.unit_ids) {
        try {
          const unitIds = data.unit_ids
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate units exist
          const validUnits = await Units.findAll({
            where: { id: unitIds, deletedAt: null },
          });

          if (validUnits.length !== unitIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some units are invalid",
            };
          }

          await AssessmentUnits.bulkCreate(
            unitIds.map((uid) => ({
              assessment_id: assessment.id,
              unit_id: uid,
            })),
            { transaction }
          );
        } catch (unitError) {
          console.error("Error creating assessment units:", unitError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment units",
          };
        }
      }

      if (data.learner_id) {
        try {
          const learnerIds = data.learner_id
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate learners exist
          const validLearners = await User.findAll({
            where: { id: learnerIds, deletedAt: null, role: Roles.LEARNER },
          });

          if (validLearners.length !== learnerIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some learners are invalid",
            };
          }

          await AssessmentLearner.bulkCreate(
            learnerIds.map((lid) => ({
              assessment_id: assessment.id,
              learner_id: lid,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error creating learner:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment learner",
          };
        }
      }

      const fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size; // size in bytes
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            fileIds.push(fileCreated.id);
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }

      // Handle assessment notes
      /**
       * Create main assessment note and if files are uploaded then create assessment note files
       * we need to provide the response like this
       * "questionnaires": [
            {
              "id": "Q001",
              "uploadedBy": "assessor",
              "files": [
              {
                "fileName": "questionnaire1.pdf link",
                "fileType": "pdf",
                "uploadedAt": "2025-08-27T10:15:00Z"
              },
              {
                "fileName": "questionnaire2.docx",
                "fileType": "docx",
                "uploadedAt": "2025-08-27T10:16:00Z"
              }
            ],
            "notes": "Please review both files carefully before uploading evidence."
          }
        ],
       */
      if (data.assessment_note) {
        try {
          const uploadedBy = RoleRoleSlug[userData.role];
          const assessmentNoteData = {
            assessment_id: assessment.id,
            user_id: userData_.id,
            uploaded_by: uploadedBy,
            feedback: data.assessment_note,
            is_main_assessment_note: true,
            status: AssessmentStatus.ASSESSMENT_CREATE,
          };
          let assessmentNote = await AssessmentNotes.create(
            assessmentNoteData,
            { transaction }
          );
          if (fileIds.length > 0 && assessmentNote) {
            await AssessmentNoteFiles.bulkCreate(
              fileIds.map((fid) => ({
                assessment_note_id: assessmentNote.id,
                file_id: fid,
              })),
              { transaction }
            );
          }
        } catch (error) {
          console.error("Error creating assessment note:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment note",
          };
        }
      }
      // Activity Create
      let role = await Role.findOne({
        where: { id: userData.role },
        attributes: ["role_slug"],
      })
      let activity = {
        activity: assessment.title,
        user_id: userData.id,
        activity_status: AssessmentStatus.ASSESSMENT_CREATE,
        center_id: userData.center_id,
        role: role.role_slug,
      }
      await activityCreate(activity, transaction)
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment created successfully",
      };
    } catch (error) {
      console.error("Error creating assessment:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Create Assessment with Chunk Upload
  static async createAssessmentWithChunkUpload(
    data: any,
    userData: userAuthenticationData,
    files: any[],
    learnerFiles: any[] = [],
    chunkSize: number = 5 * 1024 * 1024 // 5MB default chunk size
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      if ("id" in data) {
        delete data.id;
      }

      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: { id: userData.id },
        attributes: ["id", "role", "center_id"],
      });

      if (
        !userData_ ||
        ![Roles.ADMIN, Roles.ASSESSOR, Roles.IQA].includes(userData_.role)
      ) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins, Assessors and IQA are allowed to create assessments.",
        };
      }
      data.assessor_id = userData_.id;
      data.center_id = userData_.center_id;

      // Create Assessment Methods
      if (data.methods && data.methods.length > 0) {
        try {
          const validMethods = await Methods.findAll({
            where: { id: { [Op.in]: data.methods } },
            attributes: ["id"],
          });

          if (validMethods.length !== data.methods.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some methods are invalid",
            };
          }

          await AssessmentMethod.bulkCreate(
            data.methods.map((methodId: number) => ({
              assessment_id: 0, // Will be updated after assessment creation
              method_id: methodId,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error creating assessment methods:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment methods",
          };
        }
      }

      // Create Assessment Units
      if (data.units && data.units.length > 0) {
        try {
          const validUnits = await Units.findAll({
            where: { id: { [Op.in]: data.units } },
            attributes: ["id"],
          });

          if (validUnits.length !== data.units.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some units are invalid",
            };
          }

          await AssessmentUnits.bulkCreate(
            data.units.map((unitId: number) => ({
              assessment_id: 0, // Will be updated after assessment creation
              unit_id: unitId,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error creating assessment units:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment units",
          };
        }
      }

      if (data.learner_id) {
        try {
          const validLearners = await UserLearner.findAll({
            where: { id: { [Op.in]: data.learner_id } },
            attributes: ["id"],
          });

          if (validLearners.length !== data.learner_id.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some learners are invalid",
            };
          }

          await AssessmentLearner.bulkCreate(
            data.learner_id.map((learnerId: number) => ({
              assessment_id: 0, // Will be updated after assessment creation
              learner_id: learnerId,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error creating assessment learner:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment learner",
          };
        }
      }

      // Create the assessment first
      const assessment = await Assessment.create(data, { transaction });

      // Update method and unit references
      if (data.methods && data.methods.length > 0) {
        await AssessmentMethod.update(
          { assessment_id: assessment.id },
          { where: { assessment_id: 0 }, transaction }
        );
      }

      if (data.units && data.units.length > 0) {
        await AssessmentUnits.update(
          { assessment_id: assessment.id },
          { where: { assessment_id: 0 }, transaction }
        );
      }

      if (data.learner_id && data.learner_id.length > 0) {
        await AssessmentLearner.update(
          { assessment_id: assessment.id },
          { where: { assessment_id: 0 }, transaction }
        );
      }

      const fileIds = [];

      // Handle file uploads with chunk upload
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;

            // Initialize chunk upload
            const initResult = await initChunkUpload(mainFileName, file.mimetype);

            if (initResult.status !== 1) {
              await transaction.rollback();
              return {
                status: STATUS_CODES.SERVER_ERROR,
                message: `Error initializing chunk upload: ${initResult.message}`,
              };
            }

            // Split file into chunks
            const chunks = splitFileIntoChunks(file.buffer, chunkSize);
            const uploadedParts: Array<{ ETag: string; PartNumber: number }> = [];

            // Upload each chunk
            for (let i = 0; i < chunks.length; i++) {
              const chunkResult = await uploadChunk(
                initResult.uploadId,
                initResult.key,
                i + 1,
                chunks[i]
              );

              if (chunkResult.status !== 1) {
                // Abort upload on failure
                await abortChunkUpload(initResult.uploadId, initResult.key);
                await transaction.rollback();
                return {
                  status: STATUS_CODES.SERVER_ERROR,
                  message: `Error uploading chunk ${i + 1}: ${chunkResult.message}`,
                };
              }

              uploadedParts.push({
                ETag: chunkResult.etag,
                PartNumber: chunkResult.partNumber,
              });
            }

            // Complete multipart upload
            const completeResult = await completeChunkUpload(
              initResult.uploadId,
              initResult.key,
              uploadedParts
            );

            if (completeResult.status !== 1) {
              await transaction.rollback();
              return {
                status: STATUS_CODES.SERVER_ERROR,
                message: `Error completing file upload: ${completeResult.message}`,
              };
            }

            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id,
                image: completeResult.fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            fileIds.push(fileCreated.id);
          } catch (fileError) {
            console.error("Error uploading file with chunk upload:", fileError);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file with chunk upload",
            };
          }
        }
      }

      // Handle learner file uploads with chunk upload
      let learnerFileIds = [];
      if (learnerFiles && learnerFiles.length > 0) {
        for (const learnerFile of learnerFiles) {
          try {
            const extension = extname(learnerFile.originalname);
            const mainFileName = `learner/${uuidv4()}${extension}`;

            // Initialize chunk upload
            const initResult = await initChunkUpload(mainFileName, learnerFile.mimetype);

            if (initResult.status !== 1) {
              await transaction.rollback();
              return {
                status: STATUS_CODES.SERVER_ERROR,
                message: `Error initializing learner file chunk upload: ${initResult.message}`,
              };
            }

            // Split file into chunks
            const chunks = splitFileIntoChunks(learnerFile.buffer, chunkSize);
            const uploadedParts: Array<{ ETag: string; PartNumber: number }> = [];

            // Upload each chunk
            for (let i = 0; i < chunks.length; i++) {
              const chunkResult = await uploadChunk(
                initResult.uploadId,
                initResult.key,
                i + 1,
                chunks[i]
              );

              if (chunkResult.status !== 1) {
                // Abort upload on failure
                await abortChunkUpload(initResult.uploadId, initResult.key);
                await transaction.rollback();
                return {
                  status: STATUS_CODES.SERVER_ERROR,
                  message: `Error uploading learner file chunk ${i + 1}: ${chunkResult.message}`,
                };
              }

              uploadedParts.push({
                ETag: chunkResult.etag,
                PartNumber: chunkResult.partNumber,
              });
            }

            // Complete multipart upload
            const completeResult = await completeChunkUpload(
              initResult.uploadId,
              initResult.key,
              uploadedParts
            );

            if (completeResult.status !== 1) {
              await transaction.rollback();
              return {
                status: STATUS_CODES.SERVER_ERROR,
                message: `Error completing learner file upload: ${completeResult.message}`,
              };
            }

            const fileType = await this.getFileType(learnerFile.mimetype);
            const fileSize = learnerFile.size;
            const fileName = learnerFile.originalname;

            // Create Learner File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.LEARNER_ASSESSMENT,
                entity_id: assessment.id,
                image: completeResult.fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            learnerFileIds.push(fileCreated.id);
          } catch (error) {
            console.log("Error uploading learner file with chunk upload:", error);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading learner file with chunk upload",
            };
          }
        }
      }

      // Handle assessment notes (same as original)
      if (data.questionnaires && data.questionnaires.length > 0) {
        try {
          for (const questionnaire of data.questionnaires) {
            const assessmentNote = await AssessmentNotes.create(
              {
                assessment_id: assessment.id,
                uploaded_by: userData.role.toString(),
                feedback: questionnaire.notes || "",
                workflow_phase: this.getWorkflowPhase(
                  data.assessment_status,
                  userData.role
                ),
              },
              { transaction }
            );

            if (questionnaire.fileIds && questionnaire.fileIds.length > 0) {
              await AssessmentNoteFiles.bulkCreate(
                questionnaire.fileIds.map((fid: number) => ({
                  assessment_note_id: assessmentNote.id,
                  file_id: fid,
                })),
                { transaction }
              );
            }
          }
        } catch (error) {
          console.error("Error creating assessment note:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment note",
          };
        }
      }

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment created successfully with chunk upload",
      };
    } catch (error) {
      console.error("Error creating assessment with chunk upload:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

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

  // Update Assessment
  static async updateAssessment(
    data: any,
    userData: userAuthenticationData,
    files: any,
    assessmentId: string,
    learnerFiles: any
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: {
          id: userData.id,
          role: {
            [Op.in]: [
              Roles.ADMIN,
              Roles.ASSESSOR,
              Roles.LEARNER,
              Roles.IQA,
              Roles.EQA,
            ],
          },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins, Assessors and IQA are allowed to update assessments.",
        };
      }
      let assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      // Update Assessment Methods
      if (data.method_ids) {
        try {
          const methodsIds = data.method_ids
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate methods exist
          const validMethods = await Methods.findAll({
            where: { id: methodsIds, deletedAt: null },
          });

          if (validMethods.length !== methodsIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some methods are invalid",
            };
          }

          await AssessmentMethod.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          await AssessmentMethod.bulkCreate(
            methodsIds.map((mid) => ({
              assessment_id: assessment.id,
              method_id: mid,
            })),
            { transaction }
          );
        } catch (methodError) {
          console.error("Error updating assessment methods:", methodError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment methods",
          };
        }
      }

      // Update Assessment Units
      if (data.unit_ids) {
        try {
          const unitIds = data.unit_ids
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate units exist
          const validUnits = await Units.findAll({
            where: { id: unitIds, deletedAt: null },
          });

          if (validUnits.length !== unitIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some units are invalid",
            };
          }

          await AssessmentUnits.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          await AssessmentUnits.bulkCreate(
            unitIds.map((uid) => ({
              assessment_id: assessment.id,
              unit_id: uid,
            })),
            { transaction }
          );
        } catch (unitError) {
          console.error("Error updating assessment units:", unitError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment units",
          };
        }
      }

      // Update Assessment Learners
      if (data.learner_id) {
        try {
          const learnerIds = data.learner_id
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate learners exist
          const validLearners = await User.findAll({
            where: { id: learnerIds, deletedAt: null, role: Roles.LEARNER },
          });

          if (validLearners.length !== learnerIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some learners are invalid",
            };
          }

          // Remove old learners for this assessment
          await AssessmentLearner.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          // Insert new learners
          await AssessmentLearner.bulkCreate(
            learnerIds.map((lid) => ({
              assessment_id: assessment.id,
              learner_id: lid,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error updating assessment learners:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment learners",
          };
        }
      }

      let isLearner_ = await User.findOne({
        where: { id: userData.id, role: Roles.LEARNER },
      });
      // Update Assessment
      // Check if login user is learner and have uploaded learner images then changes assessment_status
      if (learnerFiles && learnerFiles.length > 0 && isLearner_) {
        data.assessment_status = AssessmentStatus.LEARNER_AGREED;
      }
      try {
        await assessment.update(data, { transaction });
        let role = await Role.findOne({
          where: { id: userData.role },
          attributes: ["role_slug"],
        })
        await activityCreate(
          {
            activity: assessment.title,
            user_id: userData.id,
            activity_status: AssessmentStatus.LEARNER_AGREED,
            center_id: userData.center_id,
            role: role.role_slug
          },
          transaction
        )
      } catch (updateError) {
        console.error("Error updating assessment:", updateError);
        await transaction.rollback();
        return {
          status: STATUS_CODES.SERVER_ERROR,
          message: "Error updating assessment",
        };
      }

      // Handle file uploads first
      let fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            fileIds.push(fileCreated.id);
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }

      // Handle file upload of learner
      let learnerFileIds = [];
      if (learnerFiles && learnerFiles.length > 0) {
        for (const learnerFile of learnerFiles) {
          try {
            const extension = extname(learnerFile.originalname);
            const mainFileName = `learner/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(learnerFile, mainFileName);
            const fileType = await this.getFileType(learnerFile.mimetype);
            const fileSize = learnerFile.size;
            const fileName = learnerFile.originalname;
            // Create Learner File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.LEARNER_ASSESSMENT,
                entity_id: assessment.id,
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            learnerFileIds.push(fileCreated.id);
          } catch (error) {
            console.log("Error uploading learner file:", error);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading learner file",
            };
          }
        }
      }

      // Handle file deletions - fix race condition
      if (data.delete_files) {
        try {
          const deleteFiles: number[] = data.delete_files
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()));

          // Fetch images before deletion to get file URLs
          const imagesToDelete = await Image.findAll({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.ASSESSMENT,
              entity_id: assessment.id,
            },
            transaction,
          });

          // Delete from database first
          await Image.destroy({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.ASSESSMENT,
              entity_id: assessment.id,
            },
            force: true,
            transaction,
          });

          // Delete files from AWS after database deletion
          for (const image of imagesToDelete) {
            try {
              await deleteFileOnAWS(image.image);
            } catch (awsError) {
              console.error("Error deleting file from AWS:", awsError);
              // Continue with other deletions even if one fails
            }
          }
        } catch (deleteError) {
          console.error("Error deleting files:", deleteError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error deleting files",
          };
        }
      }

      // Handle assessment notes
      if (data.assessment_note) {
        try {
          const assessmentNote = await AssessmentNotes.findAll({
            where: { assessment_id: assessment.id },
            order: [
              ["cycle", "DESC"],
              ["updatedAt", "DESC"],
            ],
          });

          // Helper function to create assessment note with files
          const createAssessmentNoteWithFiles = async (
            noteData: any,
            fileIds: number[]
          ) => {
            const newNote = await AssessmentNotes.create(noteData, {
              transaction,
            });
            if (fileIds.length > 0 && newNote) {
              await AssessmentNoteFiles.bulkCreate(
                fileIds.map((fid) => ({
                  assessment_note_id: newNote.id,
                  file_id: fid,
                })),
                { transaction }
              );
            }
            return newNote;
          };

          // Check if assessment note is main assessment note then update it
          if (
            assessmentNote.length == 1 &&
            assessmentNote[0].is_main_assessment_note &&
            userData_.role == Roles.ASSESSOR
          ) {
            await assessmentNote[0].update(
              {
                feedback: data.assessment_note,
                workflow_phase: this.getWorkflowPhase(
                  data.assessment_status || assessment.assessment_status,
                  userData_.role
                ),
              },
              { transaction }
            );
            if (fileIds.length > 0 && assessmentNote[0]) {
              await AssessmentNoteFiles.bulkCreate(
                fileIds.map((fid) => ({
                  assessment_note_id: assessmentNote[0].id,
                  file_id: fid,
                })),
                { transaction }
              );
            }
          } else {
            // Get current cycle or default to 1
            const currentCycle =
              assessmentNote.length > 0 ? assessmentNote[0].cycle : 0;

            // Get previous status for workflow phase calculation
            const previousStatus =
              assessmentNote.length > 0 ? assessmentNote[0].status : null;

            // Define role-specific configurations
            const roleConfigs = {
              [Roles.LEARNER]: {
                uploaded_by: RoleSlug.LEARNER,
                cycle: currentCycle + 1,
                status:
                  data.assessment_status || AssessmentStatus.LEARNER_AGREED,
                fileIds: learnerFileIds,
              },
              [Roles.ASSESSOR]: {
                uploaded_by: RoleSlug.ASSESSOR,
                cycle: currentCycle,
                status: data.assessment_status,
                fileIds: fileIds,
              },
              [Roles.IQA]: {
                uploaded_by: RoleSlug.IQA,
                cycle: currentCycle,
                status: data.assessment_status,
                fileIds: fileIds,
              },
            };

            const config = roleConfigs[userData_.role];
            if (config) {
              const assessmentNoteData = {
                assessment_id: assessment.id,
                user_id: userData_.id,
                uploaded_by: config.uploaded_by,
                feedback: data.assessment_note,
                is_main_assessment_note: false,
                cycle: config.cycle,
                status: config.status,
                workflow_phase: this.getWorkflowPhase(
                  config.status,
                  userData_.role,
                  previousStatus
                ),
              };

              await createAssessmentNoteWithFiles(
                assessmentNoteData,
                config.fileIds
              );
            }
          }
        } catch (error) {
          console.error("Error updating assessment note:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment note",
          };
        }
      }

      // Check if Assessor rejected the assessment
      if (
        userData_.role === Roles.ASSESSOR &&
        data.assessment_status === AssessmentStatus.ASSESSOR_REJECT
      ) {
        try {
          // Delete all assessment mark entries for this assessment
          const deletedMarks = await AssessmentMarks.destroy({
            where: {
              assessment_id: assessment.id,
            },
            force: true, // Hard delete
            transaction,
          });
          let role = await Role.findOne({
            where: { id: userData.role },
            attributes: ["role_slug"],
          })
          // Activity Create
          await activityCreate(
            {
              user_id: userData_.id,
              activity: assessment.title,
              activity_status: AssessmentStatus.ASSESSOR_REJECT,
              center_id: userData_.center_id,
              role: role.role_slug
            },
            transaction
          );

          console.log(
            `Deleted ${deletedMarks} assessment mark entries due to IQA rejection`
          );
        } catch (error) {
          console.error(
            "Error deleting assessment marks after IQA rejection:",
            error
          );
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error deleting assessment marks after IQA rejection",
          };
        }
      }

      // Handle Assessment Mark
      if (data.assessment_mark) {
        try {
          let marksData = data.assessment_mark;
          if (typeof marksData === "string") {
            // marksData = JSON.parse(marksData);
          }

          // Basic validation for required parameters
          if (
            !marksData.assessment_id ||
            !marksData.learner_id ||
            !marksData.marks ||
            !Array.isArray(marksData.marks)
          ) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message:
                "Assessment mark data is missing required parameters: assessment_id, learner_id, and marks array",
            };
          }

          // Process each mark entry
          for (const markEntry of marksData.marks) {
            const {
              qualification_id,
              unit_id,
              main_outcome_id,
              sub_outcome_id,
              subpoint_id,
              marks,
            } = markEntry;

            // Check if marks already exist for this specific criteria to determine attempt number
            const existingMarks = await AssessmentMarks.findOne({
              where: {
                assessment_id: marksData.assessment_id,
                learner_id: marksData.learner_id,
                qualification_id: qualification_id,
                unit_id: unit_id || null,
                main_outcome_id: main_outcome_id || null,
                sub_outcome_id: sub_outcome_id || null,
                subpoint_id: subpoint_id || null,
                deletedAt: null,
              },
              order: [["attempt", "DESC"]],
              transaction,
            });

            if (existingMarks) {
              // Update the existing record
              await existingMarks.update(
                {
                  marks: marks.toString(),
                  assessor_id: userData_.id,
                },
                { transaction }
              );
            } else {
              // Calculate attempt number - if marks exist, increment by 1, otherwise start with 1
              const attemptNumber = existingMarks
                ? (parseInt(existingMarks.attempt) + 1).toString()
                : "1";

              // Create new mark entry with proper attempt number
              await AssessmentMarks.create(
                {
                  assessment_id: marksData.assessment_id,
                  learner_id: marksData.learner_id,
                  assessor_id: userData_.id,
                  qualification_id: qualification_id,
                  unit_id: unit_id,
                  main_outcome_id: main_outcome_id,
                  sub_outcome_id: sub_outcome_id,
                  subpoint_id: subpoint_id,
                  marks: marks.toString(),
                  max_marks: "2", // Default max marks
                  attempt: attemptNumber,
                },
                { transaction }
              );
            }
          }
          console.log(
            `Successfully processed ${marksData.marks.length} mark entries for assessment ${marksData.assessment_id}, learner ${marksData.learner_id}`
          );
        } catch (error) {
          console.error("Error updating assessment mark:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment mark",
          };
        }
      }
      let role = await Role.findOne({
        where: { id: userData.role },
        attributes: ["role_slug"],
      })
      // Activity Create For Assessment Accepted by Assessor, IQA Agreed and IQA not Agreed for
      if (
        data.assessment_status === AssessmentStatus.ASSESSMENT_COMPLETED ||
        data.assessment_status === AssessmentStatus.AGREED_BY_IQA ||
        data.assessment_status === AssessmentStatus.NOT_AGREED_BY_IQA
      ) {
        if (data.assessment_status === AssessmentStatus.ASSESSMENT_COMPLETED) {
          await activityCreate(
            {
              user_id: userData_.id,
              activity: assessment.title,
              activity_status: AssessmentStatus.ASSESSMENT_COMPLETED,
              center_id: userData_.center_id,
              role: role.role_slug
            },
            transaction
          );
        }
        if (data.assessment_status === AssessmentStatus.AGREED_BY_IQA) {
          await activityCreate(
            {
              user_id: userData_.id,
              activity: assessment.title,
              activity_status: AssessmentStatus.AGREED_BY_IQA,
              center_id: userData_.center_id,
              role: role.role_slug
            },
            transaction
          );
        }
        if (data.assessment_status === AssessmentStatus.NOT_AGREED_BY_IQA) {
          await activityCreate(
            {
              user_id: userData_.id,
              activity: assessment.title,
              activity_status: AssessmentStatus.AGREED_BY_IQA,
              center_id: userData_.center_id,
              role: role.role_slug
            },
            transaction
          );
        }
      }

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "Assessment updated successfully",
      };
    } catch (error) {
      console.error("Error updating assessment:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // List Assessment
  static async listAssessment(
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

      // Where condition
      let whereCondition: any = {
        deletedAt: null,
      };

      // Check login user is IQA
      let isIqa = await User.findOne({
        where: { id: userData.id, role: Roles.IQA },
      });
      if (isIqa) {
        whereCondition.assessment_status = {
          [Op.in]: [
            AssessmentStatus.NOT_AGREED_BY_IQA,
            AssessmentStatus.AGREED_BY_IQA,
            AssessmentStatus.ASSESSMENT_COMPLETED,
          ],
        };
      }

      let learnerWhereCondition: any = {
        deletedAt: null,
      };
      let learnerRequired = false;

      // Check if Logged in user is Learner then need to show only assigned assessment of that learner
      let isLearner_ = await User.findOne({
        where: { id: userData.id, role: Roles.LEARNER },
      });
      if (isLearner_) {
        learnerRequired = true;
        learnerWhereCondition.id = isLearner_.id;
      }
      if (data.learner_id) {
        const learnerIds = data.learner_id
          .toString()
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);

        if (learnerIds.length > 0) {
          learnerWhereCondition.id = { [Op.in]: learnerIds };
          learnerRequired = true;
        }
      }
      let whereQualificationCondition: any = {
        deletedAt: null,
      };
      let requiredQualification = false;
      if (data.qualification_id) {
        whereQualificationCondition.id = data.qualification_id;
        requiredQualification = true;
      }

      // Search
      let search = data?.search || "";
      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
          ]
        };
      }

      let assessment_ = await Assessment.findAndCountAll({
        where: {
          ...searchOptions,
          ...whereCondition,
        },
        include: [
          // {
          //   model: Methods,
          //   as: "methods",
          //   required: false,
          //   through: { attributes: [] }, // prevent including join table info
          // },
          // {
          //   model: Units,
          //   as: "units",
          //   required: false,
          //   through: { attributes: [] }, // prevent including join table info
          // },
          // {
          //   model: Image,
          //   as: "images",
          //   required: false,
          //   where: {
          //     entity_type: Entity.ASSESSMENT,
          //   },
          // },
          // {
          //   model: Image,
          //   as: "learner_image",
          //   required: false,
          //   where: {
          //     entity_type: Entity.LEARNER_ASSESSMENT,
          //   },
          // },
          {
            model: User,
            as: "learners",
            required: learnerRequired,
            where: learnerWhereCondition,
            through: { attributes: [] },
          },
          // {
          //   model: User,
          //   as: "assessor",
          //   required: false,
          // },
          {
            model: Qualifications,
            as: "qualification",
            required: requiredQualification,
            where: whereQualificationCondition,
          },
          // {
          //   model: AssessmentNotes,
          //   as: "evidence_cycles",
          //   required: false,
          //   include: [
          //     {
          //       model: Image,
          //       as: "files",
          //       required: false,
          //       through: { attributes: [] },
          //     },
          //     {
          //       model: User,
          //       as: "user",
          //       required: false,
          //       attributes: ["id", "name", "surname"],
          //     }
          //   ],
          // }
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });

      assessment_ = JSON.parse(JSON.stringify(assessment_));

      const pagination = await paginate(assessment_, limit, page, fetchAll);
      const response = {
        data: assessment_.rows,
        pagination: pagination,
      };

      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Assessment listed successfully",
      };
    } catch (error) {
      console.error("Error listing assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Get Assessment by ID
  static async getAssessmentById(
    assessmentId: string,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      // Get user role to determine workflow phase filtering
      const user = await User.findByPk(userData.id);
      let evidenceWhereCondition: any = {
        deletedAt: null,
      };

      // Filter assessment notes based on user role and workflow phase
      if (user && user.role === Roles.LEARNER) {
        // Learners can only see assessment notes with workflow_phase = 0
        // This hides IQA disagreement comments from learners
        evidenceWhereCondition.workflow_phase = 0;
      } else if (user && user.role === Roles.IQA) {
        // IQA can see all assessment notes (no filtering)
        // IQA needs to see all phases to understand the complete workflow
      } else if (user && user.role === Roles.ASSESSOR) {
        // Assessors can see all assessment notes (no filtering)
        // Assessors need to see all phases to respond appropriately
      }

      let assessment: any = await Assessment.findByPk(assessmentId, {
        include: [
          {
            model: Methods,
            as: "methods",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Units,
            as: "units",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Image,
            as: "images",
            required: false,
            where: {
              entity_type: Entity.ASSESSMENT,
            },
          },
          {
            model: Image,
            as: "learner_image",
            required: false,
            where: {
              entity_type: Entity.LEARNER_ASSESSMENT,
            },
          },
          {
            model: AssessmentNotes,
            as: "evidence_cycles",
            where: evidenceWhereCondition,
            required: false,
            include: [
              {
                model: Image,
                as: "files",
                required: false,
                through: { attributes: [] },
              },
              {
                model: User,
                as: "user",
                required: false,
                attributes: ["id", "name", "surname"],
              },
            ],
          },
        ],
        order: [
          [{ model: AssessmentNotes, as: "evidence_cycles" }, "id", "DESC"],
        ],
      });

      assessment = JSON.parse(JSON.stringify(assessment));

      let learner_comment = false;
      let assessor_comment = false;

      if (assessment) {
        if (
          assessment.assessment_status == AssessmentStatus.ASSESSMENT_CREATE
        ) {
          learner_comment = true;
          assessor_comment = true;
        } else if (
          assessment.assessment_status == AssessmentStatus.LEARNER_AGREED
        ) {
          learner_comment = false;
          assessor_comment = true;
        } else if (
          assessment.assessment_status == AssessmentStatus.ASSESSMENT_COMPLETED
        ) {
          learner_comment = false;
          assessor_comment = false;
        } else if (
          assessment.assessment_status == AssessmentStatus.ASSESSOR_REJECT
        ) {
          learner_comment = true;
          assessor_comment = false;
        }
        assessment.learner_comment = learner_comment;
        assessment.assessor_comment = assessor_comment;
      }

      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Delete Assessment
  static async deleteAssessment(
    assessmentId: string,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      // Delete related images from AWS first
      const images = await Image.findAll({
        where: {
          entity_type: Entity.ASSESSMENT,
          entity_id: assessment.id,
        },
      });

      for (const image of images) {
        try {
          await deleteFileOnAWS(image.image);
        } catch (awsError) {
          console.error("Error deleting file from AWS:", awsError);
        }
      }

      // Delete related records
      await AssessmentMethod.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await AssessmentUnits.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await AssessmentLearner.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await Image.destroy({
        where: {
          entity_type: Entity.ASSESSMENT,
          entity_id: assessment.id,
        },
        force: true,
        transaction,
      });

      // Delete Assessment Notes
      let assessmentNotes = await AssessmentNotes.findAll({
        where: { assessment_id: assessment.id },
        attributes: ["id"],
      });
      let assessmentNoteIds = assessmentNotes.map(
        (assessmentIds) => assessmentIds.id
      );
      // Delete Assessment Notes Files first
      if (assessmentNoteIds.length > 0) {
        await AssessmentNoteFiles.destroy({
          where: { assessment_note_id: { [Op.in]: assessmentNoteIds } },
          transaction,
          force: true,
        });
      }

      // Then delete Assessment Notes
      await AssessmentNotes.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      // Soft delete the assessment
      await assessment.destroy({ force: true, transaction });

      // Delete Assessment Marks
      await AssessmentMarks.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });
      let role = await Role.findOne({
        where: { id: userData.role },
        attributes: ["role_slug"],
      })
      // Delete Assessment Activity
      await activityCreate(
        {
          activity: assessment.title,
          user_id: userData.id,
          activity_status: AssessmentStatus.ASSESSMENT_DELETE,
          center_id: userData.center_id,
          role: role.role_slug
        }
      )

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        message: "Assessment deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting assessment:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Update Assessment Status
  static async updateAssessmentStatus(
    data: any,
    assessment_id: string,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const assessment = await Assessment.findByPk(assessment_id);
      if (!assessment) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      const newStatus = data.assessment_status;
      const currentStatus = assessment.assessment_status;

      // Validation rules
      if (
        newStatus === AssessmentStatus.ASSESSOR_REJECT &&
        currentStatus !== AssessmentStatus.LEARNER_AGREED
      ) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message:
            "Action not allowed: An assessment can only be rejected after the learner has agreed. Please check the current status and try again.",
        };
      }

      if (
        newStatus === AssessmentStatus.ASSESSMENT_COMPLETED &&
        currentStatus !== AssessmentStatus.LEARNER_AGREED
      ) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message:
            "Action not allowed: Assessment completion is only possible after learner agreement. Ensure the learner has agreed before completing.",
        };
      }

      // Update only if valid
      assessment.assessment_status = newStatus;
      assessment.feedback = data.feedback;
      await assessment.save({ transaction });

      // if (data.assessment_note) {
      //   try {
      //     const assessmentNote = await AssessmentNotes.findAll({
      //       where: { assessment_id: assessment.id },
      //       order: [['cycle', 'DESC']]
      //     });
      //     // check if assessment note is main assessment note then update it
      //     if (assessmentNote.length == 1 && assessmentNote[0].is_main_assessment_note && userData_.role == Roles.ASSESSOR) {
      //       await assessmentNote[0].update({
      //         feedback: data.assessment_note,
      //       }, { transaction });
      //     } else {
      //       // Now we need to check if API call came from learner then we need to create new assessment note
      //       if (userData_.role == Roles.LEARNER) {
      //         let assessmentNoteData = {
      //           assessment_id: assessment.id,
      //           user_id: userData_.id,
      //           uploaded_by: 2,
      //           feedback: data.assessment_note,
      //           is_main_assessment_note: false,
      //           cycle: assessmentNote[0].cycle + 1 || 1,
      //         };
      //         let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
      //         if (learnerFileIds.length > 0 && assessmentNote_) {
      //           await AssessmentNoteFiles.bulkCreate(
      //             learnerFileIds.map((fid) => ({
      //               assessment_note_id: assessmentNote_.id,
      //               file_id: fid,
      //             })),
      //             { transaction }
      //           );
      //         }
      //       }
      //       // Now need to check if API call came from assessor then need to create new assessment note but cycle number is same
      //       if (userData_.role == Roles.ASSESSOR) {
      //         let assessmentNoteData = {
      //           assessment_id: assessment.id,
      //           user_id: userData_.id,
      //           uploaded_by: 1,
      //           feedback: data.assessment_note,
      //           is_main_assessment_note: false,
      //           cycle: assessmentNote[0].cycle,
      //         }
      //         let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
      //         if (fileIds.length > 0 && assessmentNote_) {
      //           await AssessmentNoteFiles.bulkCreate(
      //             fileIds.map((fid) => ({
      //               assessment_note_id: assessmentNote_.id,
      //               file_id: fid,
      //             })),
      //             { transaction }
      //           );
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     console.error("Error updating assessment note:", error);
      //     await transaction.rollback();
      //     return {
      //       status: STATUS_CODES.SERVER_ERROR,
      //       message: "Error updating assessment note",
      //     };
      //   }
      // }

      await transaction.commit();

      return {
        status: STATUS_CODES.SUCCESS,
        message: "Assessment status updated successfully",
      };
    } catch (error) {
      console.error("Error updating assessment status:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Get Assessment Marks
  static async getAssessmentMarks(
    assessmentId: string,
    learnerId: string,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      // Validate that the user has access to this assessment
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      // Check if user is assessor, IQA, or admin for this assessment
      let hasAccess = false;
      if (userData.role === Roles.ADMIN) {
        hasAccess = true;
      } else if (
        userData.role === Roles.ASSESSOR &&
        assessment.assessor_id === userData.id
      ) {
        hasAccess = true;
      } else if (userData.role === Roles.IQA) {
        // IQA can access assessments in their center
        const user = await User.findByPk(userData.id);
        if (user && user.center_id === assessment.center_id) {
          hasAccess = true;
        }
      } else if (
        userData.role === Roles.LEARNER &&
        parseInt(learnerId) === userData.id
      ) {
        // Learner can only see their own marks
        hasAccess = true;
      }

      if (!hasAccess) {
        return {
          status: STATUS_CODES.FORBIDDEN,
          message: "You don't have permission to view these assessment marks",
        };
      }

      // Get assessment marks
      const marks = await AssessmentMarks.findAll({
        where: {
          assessment_id: assessmentId,
          learner_id: learnerId,
          deletedAt: null,
        },
        include: [
          {
            model: Qualifications,
            as: "qualification",
            required: false,
            attributes: ["id", "name", "qualification_no"],
          },
          {
            model: Units,
            as: "unit",
            required: false,
            attributes: ["id", "name", "unit_code"],
          },
        ],
        order: [
          ["qualification_id", "ASC"],
          ["unit_id", "ASC"],
          ["main_outcome_id", "ASC"],
          ["sub_outcome_id", "ASC"],
          ["subpoint_id", "ASC"],
        ],
      });

      return {
        status: STATUS_CODES.SUCCESS,
        data: {
          assessment_id: assessmentId,
          learner_id: learnerId,
          marks: marks,
        },
        message: "Assessment marks retrieved successfully",
      };
    } catch (error) {
      console.error("Error retrieving assessment marks:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Statistics
  static async statistics(
    data,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      let learnerId = data.learner_id;
      let qualification_id = data.qualification_id;

      // Check if login user is learner
      const isLearner = await User.findOne({
        where: { id: userData.id, role: Roles.LEARNER },
      });
      if (isLearner) {
        learnerId = isLearner.id;
      }

      if (!learnerId) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Learner id is required",
        };
      }

      let assessmentWhereCondition: any = {
        deletedAt: null,
        learner_id: learnerId,
      };
      if (qualification_id) {
        assessmentWhereCondition.qualification_id = qualification_id;
      }

      // Fetch all marks ordered by latest first
      const assessmentMarks = await AssessmentMarks.findAll({
        where: assessmentWhereCondition,
        order: [["createdAt", "DESC"]],
      });

      let qualificationCondition = "";
      let replacements: any = { learnerId };

      if (qualification_id) {
        qualificationCondition = "AND qualification_id = :qualification_id";
        replacements.qualification_id = qualification_id;
      }

      const learnerTotalMarks = await sequelize.query(
        `
        SELECT 
            COALESCE(SUM(am.marks), 0) AS total_marks,
            COALESCE(SUM(am.max_marks), 0) AS total_max_marks
        FROM tbl_assessment_marks am
        INNER JOIN (
            SELECT 
                learner_id,
                qualification_id,
                unit_id,
                sub_outcome_id,
                COALESCE(subpoint_id, -1) AS subpoint_group,
                MAX(marks) AS best_marks
            FROM tbl_assessment_marks
            WHERE learner_id = :learnerId
              ${qualificationCondition}
              AND deletedAt IS NULL
            GROUP BY learner_id, qualification_id, unit_id, sub_outcome_id, COALESCE(subpoint_id, -1)
        ) best
          ON am.learner_id = best.learner_id
         AND am.qualification_id = best.qualification_id
         AND am.unit_id = best.unit_id
         AND am.sub_outcome_id = best.sub_outcome_id
         AND COALESCE(am.subpoint_id, -1) = best.subpoint_group
         AND am.marks = best.best_marks
        WHERE am.deletedAt IS NULL
        `,
        { replacements, type: sequelize.QueryTypes.SELECT }
      );

      let totalMarks_ = learnerTotalMarks[0].total_marks;
      let totalMaxMarks_ = learnerTotalMarks[0].total_max_marks;

      // Extract Total units assigned to learner and remove duplicate units
      const totalUnitsInArray = assessmentMarks.map((mark) => mark.unit_id);
      const totalUnits = [...new Set(totalUnitsInArray)];

      // Get total units sub outcomes and sub points default marks
      const totalUnitsSubOutcomes = await SubOutcomes.findAll({
        where: { unit_id: { [Op.in]: totalUnits }, deletedAt: null },
        attributes: ["id", "marks", "unit_id"],
      });
      const totalUnitsSubOutcomesInArray = totalUnitsSubOutcomes.map(
        (outcome) => outcome.id
      );
      const totalUnitsSubPoints = await OutcomeSubpoints.findAll({
        where: {
          outcome_id: { [Op.in]: totalUnitsSubOutcomesInArray },
          deletedAt: null,
        },
        attributes: ["id", "marks", "outcome_id"],
      });

      let totalSubPointsMarks = totalUnitsSubPoints.reduce(
        (acc, curr) => acc + parseFloat(curr.marks),
        0
      );
      let totalSubOutcomesMarks = totalUnitsSubOutcomes.reduce(
        (acc, curr) => acc + parseFloat(curr.marks),
        0
      );
      let totalMarksPossible = totalSubPointsMarks + totalSubOutcomesMarks;

      // Calculate total progress of learner in percentage from total marks and given marks by assessor
      // Calculate progress %
      let progressPercentage = 0.0;
      if (totalMarksPossible > 0) {
        progressPercentage = Number(
          ((totalMarks_ / totalMarksPossible) * 100).toFixed(2)
        );
      }
      // ---- Unit-specific progress ----
      let unitsProgress: any[] = [];

      for (const unitId of totalUnits) {
        // Earned marks for this unit
        let unitQualificationCondition = "";
        let unitReplacements: any = { learnerId, unitId };

        if (qualification_id) {
          unitQualificationCondition =
            "AND qualification_id = :qualification_id";
          unitReplacements.qualification_id = qualification_id;
        }

        const unitMarks = await sequelize.query(
          `
  SELECT 
      COALESCE(SUM(am.marks), 0) AS total_marks,
      COALESCE(SUM(am.max_marks), 0) AS total_max_marks
  FROM tbl_assessment_marks am
  INNER JOIN (
      SELECT 
          learner_id,
          qualification_id,
          unit_id,
          sub_outcome_id,
          COALESCE(subpoint_id, -1) AS subpoint_group,
          MAX(marks) AS best_marks
      FROM tbl_assessment_marks
      WHERE learner_id = :learnerId 
        ${unitQualificationCondition}
        AND unit_id = :unitId
        AND deletedAt IS NULL
      GROUP BY learner_id, qualification_id, unit_id, sub_outcome_id, COALESCE(subpoint_id, -1)
  ) best
    ON am.learner_id = best.learner_id
   AND am.qualification_id = best.qualification_id
   AND am.unit_id = best.unit_id
   AND am.sub_outcome_id = best.sub_outcome_id
   AND COALESCE(am.subpoint_id, -1) = best.subpoint_group
   AND am.marks = best.best_marks
  WHERE am.deletedAt IS NULL
  `,
          {
            replacements: unitReplacements,
            type: sequelize.QueryTypes.SELECT,
          }
        );

        let unitEarned = parseFloat(unitMarks[0].total_marks);

        // Possible marks for this unit
        let unitOutcomes = totalUnitsSubOutcomes.filter(
          (o) => o.unit_id === unitId
        );
        let unitOutcomeIds = unitOutcomes.map((o) => o.id);

        let unitSubpoints = totalUnitsSubPoints.filter((sp) =>
          unitOutcomeIds.includes(sp.outcome_id)
        );

        let unitPossible =
          unitOutcomes.reduce((acc, o) => acc + parseFloat(o.marks), 0) +
          unitSubpoints.reduce((acc, sp) => acc + parseFloat(sp.marks), 0);

        let unitProgress = 0;
        if (unitPossible > 0) {
          unitProgress = Number(((unitEarned / unitPossible) * 100).toFixed(2));
        }

        // Get the unit details to include unit_number in response
        const unitDetails = await Units.findByPk(unitId, {
          attributes: ["id", "unit_number", "unit_title", "qualification_id"],
        });

        unitsProgress.push({
          unit_id: unitId,
          unit_number: unitDetails ? unitDetails.unit_number : null,
          unit_title: unitDetails ? unitDetails.unit_title : null,
          qualification_id: unitDetails ? unitDetails.qualification_id : null,
          earned_marks: unitEarned,
          total_possible_marks: unitPossible,
          progress_percentage: unitProgress,
        });
      }
      return {
        status: STATUS_CODES.SUCCESS,
        data: {
          earned_marks: totalMarks_,
          earned_max_marks: totalMaxMarks_,
          total_possible_marks: totalMarksPossible,
          progress_percentage: progressPercentage,
          total_units: totalUnits.length,
          units_progress: unitsProgress,
        },
        message: "Statistics fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default AssessmentService;
