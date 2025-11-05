require("dotenv").config();
import { userAuthenticationData } from "../../interface/user";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import XLSX from "xlsx";
import Qualifications from "../../database/schema/qualifications";
import Units from "../../database/schema/units";
import SubOutcomes from "../../database/schema/sub_outcomes";
import OutcomeSubpoints from "../../database/schema/outcome_subpoints";
import { col, fn, Op, Order, Sequelize } from "sequelize";
import { paginate, qualificationUserId, retryDatabaseOperation, uploadFileOnAWSDownloadable } from "../../helper/utils";
import UserQualification from "../../database/schema/user_qualification";
import Assessment from "../../database/schema/assessment";
import AssessmentUnits from "../../database/schema/assessment_units";
import UserUnits from "../../database/schema/user_units";
import AssessmentMarks from "../../database/schema/assessment_marks";
import Category from "../../database/schema/category";
import MainOutcomes from "../../database/schema/main_outcomes";
import { extname } from "path";
const { sequelize } = require("../../configs/database");

class qualificationService {
  // Helper method to clean description text
  private static cleanDescriptionText(text: string): string {
    if (!text) return "";

    const originalText = text;
    const cleanedText = text
      // Remove the specific bullet character we found in the database (U+F0B7)
      .replace(/^\uF0B7\s*/, "")
      // Remove common bullet points and special characters at the beginning
      .replace(/^[\s•●▪‣◦¤··\-–—*\u2022\u2023\u25AA\u00B7\u2024\u2043\u2219\u25E6\u25AA\u25AB\u25B6\u25C0\u25C6\u25CB\u25D9\u25E7\u25F7\u25F8\u25F9\u25FA\u25FB\u25FC\u25FD\u25FE\u25FF]+/g, "")
      // Remove common separators and formatting characters
      .replace(/^[\s\-_*]+/g, "")
      // Remove any remaining leading/trailing whitespace
      .trim();

    // Log if there was significant cleaning done
    if (originalText !== cleanedText) {
      // console.log(`Cleaned text: "${originalText}" -> "${cleanedText}"`);
    }

    return cleanedText;
  }

  // Create qualification method
  static async createQualification(
    userData: userAuthenticationData,
    file
  ): Promise<any> {
    return await retryDatabaseOperation(async () => {
      const transaction = await sequelize.transaction();
      try {
        if (!file || !file.buffer || file.size === 0) {
          await transaction.rollback();
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Please upload a valid file.",
          };
        }
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        // Qualification data processing logic goes here
        const sheetName = workbook.SheetNames[0]; // This is a string like "Sheet1"
        const firstSheet = workbook.Sheets[sheetName]; // This gets the actual sheet object
        // Extract values from specific cells
        const qualificationName = firstSheet["B1"]?.v?.toString().trim() || "";
        const qualificationNumber = firstSheet["B2"]?.v?.toString().trim() || "";
        let validateQualificationNumber = await Qualifications.findOne({
          where: { qualification_no: qualificationNumber, deletedAt: null },
          attributes: ["id"],
        });
        if (validateQualificationNumber) {
          await transaction.rollback();
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Qualification Number Already Exist",
          };
        }
        // Validate extracted data
        if (!qualificationName || !qualificationNumber) {
          await transaction.rollback();
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Qualification name or number is missing in the Excel file.",
          };
        }
        const qualificationData = await Qualifications.create(
          {
            name: qualificationName,
            qualification_no: qualificationNumber,
            created_by: userData.id,
          },
          { transaction }
        );
        // Unit Data processing logic
        // Track processed unit_ref_no values within this Excel file to detect duplicates
        const processedUnitRefNos = new Map<string, string>(); // Map<unit_ref_no, sheetName>
        let hasMandatoryUnit = false; // Track if at least one mandatory unit exists
        let category_id_created = []; // Track the id of the category that was created

        for (const sheetName of workbook.SheetNames) {
          // Skip the front page sheet and only process unit sheets
          if (sheetName.toLowerCase() === "front page" || sheetName.toLowerCase() === "frontpage") continue;
          // Process each unit sheet
          const sheet = workbook.Sheets[sheetName];
          const unitNo = sheet["B1"]?.v?.toString().trim() || "";
          const unitName = sheet["B2"]?.v?.toString().trim() || "";
          const unitRefNo = sheet["B3"]?.v?.toString().trim() || "";
          const category = sheet["B4"]?.v?.toString().trim() || "";
          const isMandatory = (sheet["B5"]?.v?.toString().trim() || "") === "Yes" ? true : false;

          // Track if at least one mandatory unit exists
          if (isMandatory) {
            hasMandatoryUnit = true;
          }

          if (!unitRefNo) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: `Unit Reference Number is missing for unit ${unitNo}`,
            };
          }

          // Check for duplicate unit_ref_no within the Excel file
          if (processedUnitRefNos.has(unitRefNo)) {
            const duplicateSheetName = processedUnitRefNos.get(unitRefNo);
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: `Duplicate Unit Reference Number '${unitRefNo}' found in Excel file. First occurrence in sheet '${duplicateSheetName}' (Unit ${unitNo}), duplicate in sheet '${sheetName}' (Unit ${unitNo}). Please remove the duplicate.`,
            };
          }

          // Mark this unit_ref_no as processed
          processedUnitRefNos.set(unitRefNo, sheetName);

          const existingUnit = await Units.findOne({
            where: { unit_ref_no: unitRefNo, deletedAt: null },
            attributes: ["id"],
          });

          if (existingUnit) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: `Unit Reference Number '${unitRefNo}' already exists in database for unit ${unitNo}`,
            };
          }

          // Check if category exists then get the id else create the category
          let categoryId: number | null = null;
          let categoryData = await Category.findOne({
            where: {
              category_name: {
                [Op.like]: category
              }
            },
            attributes: ["id", "is_mandatory"],
          });
          if (categoryData) {
            if (categoryData.is_mandatory !== isMandatory) {
              await transaction.rollback();
              return {
                status: STATUS_CODES.BAD_REQUEST,
                message: "Category already exists but is mandatory is different. Please update the category mandatory status."
              }
            }
            categoryId = categoryData.id;
          } else {
            categoryData = await Category.create({ category_name: category, is_mandatory: isMandatory });
            categoryId = categoryData.id;
            category_id_created.push(categoryData.id);
          }
          // create unit
          let unitData = await Units.create(
            {
              qualification_id: qualificationData.id,
              unit_title: unitName,
              unit_number: unitNo,
              unit_ref_no: unitRefNo,
              category_id: categoryId,
              created_by: userData.id,
            },
            { transaction }
          );
          // Extract sub outcome data
          const range = XLSX.utils.decode_range(sheet["!ref"] || "");
          let currentSubOutcomeId: number | null = null;
          let currentMainOutcomeId: number | null = null;
          for (let row = 6; row <= range.e.r; row++) {
            const codeCell = sheet[XLSX.utils.encode_cell({ c: 0, r: row })];
            const descCell = sheet[XLSX.utils.encode_cell({ c: 1, r: row })];

            const code = codeCell?.v?.toString().trim();
            const description = descCell?.v?.toString().trim();

            if (code && /^[0-9]+(\.0+)*$/.test(code)) {
              // Create MainOutcome
              const mainOutcome = await MainOutcomes.create({
                unit_id: unitData.id,
                qualification_id: qualificationData.id,
                main_number: code,
                description: description || "",
                created_by: userData.id,
              }, { transaction });
              currentMainOutcomeId = mainOutcome.id;
            } else if (code && /^[0-9]+\.[0-9]+$/.test(code)) {
              // Create SubOutcome
              const subOutCome = await SubOutcomes.create(
                {
                  unit_id: unitData.id,
                  qualification_id: qualificationData.id,
                  description: description || "",
                  main_outcome_id: currentMainOutcomeId,
                  outcome_number: code,
                  created_by: userData.id,
                },
                { transaction }
              );
              currentSubOutcomeId = subOutCome.id;
            } else if (currentSubOutcomeId && !code && description) {
              const cleanedDescription = this.cleanDescriptionText(description);

              // Only create SubPoints if the cleaned description is not empty
              if (cleanedDescription && cleanedDescription.length > 0) {
                await OutcomeSubpoints.create(
                  {
                    outcome_id: currentSubOutcomeId,
                    point_text: cleanedDescription,
                    created_by: userData.id,
                  },
                  { transaction }
                );
              }
            }
          }
        }

        // Validate that at least one mandatory unit exists
        if (!hasMandatoryUnit) {
          /**
           * Need to delete the category that was created if it was created
           * because category is created and we can not add transection in category model
           * for that reason we are deleting the category that was created if it was created
           * and if we did not delete then if user try to add another qualification with same category then it will give error
           */
          if (category_id_created.length > 0) {
            await Category.destroy({ where: { id: { [Op.in]: category_id_created } }, force: true });
          }
          await transaction.rollback();
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "At least one mandatory unit is required in the Excel file.",
          };
        }

        // upload file on AWS
        const extension = extname(file.originalname);
        const fileName = qualificationName.replace(/\s+/g, "-")
        const mainFileName = `${fileName}${extension}`;
        let qualification_file = await uploadFileOnAWSDownloadable(file, mainFileName)
        // update in database
        qualificationData.qualification_file = qualification_file
        await Qualifications.update({ qualification_file }, { where: { id: qualificationData.id }, transaction })
        // Commit transaction
        await transaction.commit();
        return {
          status: STATUS_CODES.SUCCESS,
          data: qualificationData,
          message: "Qualification created successfully.",
        };
      } catch (error) {
        console.error("Error creating qualification:", error);
        // Rollback transaction in case of error
        if (transaction) await transaction.rollback();
        return {
          status: STATUS_CODES.SERVER_ERROR,
          message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
        };
      }
    });
  }

  // Method to clean existing problematic records in the database
  static async cleanExistingRecords(): Promise<any> {
    try {
      console.log("Starting cleanup of existing records...");

      // First, let's see what we actually have in the database
      const allRecords = await OutcomeSubpoints.findAll({
        limit: 20, // Just get a sample to see what we're working with
        attributes: ['id', 'point_text']
      });

      // Enhanced detection patterns - look for more variations
      const problematicRecords = await OutcomeSubpoints.findAll({
        where: {
          [Op.or]: [
            // Look for the specific bullet character we found (U+F0B7)
            { point_text: { [Op.like]: '\uF0B7%' } },
            // Look for records starting with various bullet points and special characters
            { point_text: { [Op.like]: '•%' } },
            { point_text: { [Op.like]: '●%' } },
            { point_text: { [Op.like]: '▪%' } },
            { point_text: { [Op.like]: '‣%' } },
            { point_text: { [Op.like]: '◦%' } },
            { point_text: { [Op.like]: '¤%' } },
            { point_text: { [Op.like]: '·%' } },
            { point_text: { [Op.like]: '·%' } },
            { point_text: { [Op.like]: '-%' } },
            { point_text: { [Op.like]: '–%' } },
            { point_text: { [Op.like]: '—%' } },
            { point_text: { [Op.like]: '*%' } },
            { point_text: { [Op.like]: '\u2022%' } },
            { point_text: { [Op.like]: '\u2023%' } },
            { point_text: { [Op.like]: '\u25AA%' } },
            // Look for records with leading spaces or tabs
            { point_text: { [Op.like]: ' %' } },
            { point_text: { [Op.like]: '\t%' } },
            // Look for records that might have been partially cleaned
            { point_text: { [Op.like]: '  %' } }, // Double spaces
            { point_text: { [Op.like]: '   %' } }, // Triple spaces
            // Look for any non-alphanumeric characters at the start
            { point_text: { [Op.regexp]: '^[^a-zA-Z0-9]' } }
          ]
        }
      });

      // Also check for records that might have been cleaned but still have issues
      const potentiallyProblematic = await OutcomeSubpoints.findAll({
        where: {
          point_text: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' },
              { [Op.regexp]: '^[\\s\\-\\_\\*\\•\\●\\▪\\‣\\◦\\¤\\·\\·\\–\\—\\\u2022\\\u2023\\\u25AA\\\uF0B7]+' }
            ]
          }
        }
      });

      let cleanedCount = 0;

      // Process the main problematic records
      for (const record of problematicRecords) {
        const originalText = record.point_text;
        const cleanedText = this.cleanDescriptionText(originalText);

        if (cleanedText !== originalText && cleanedText.length > 0) {
          await record.update({ point_text: cleanedText });
          cleanedCount++;
        }
      }

      // Process potentially problematic records
      for (const record of potentiallyProblematic) {
        const originalText = record.point_text;
        const cleanedText = this.cleanDescriptionText(originalText);

        if (cleanedText !== originalText && cleanedText.length > 0) {
          await record.update({ point_text: cleanedText });
          cleanedCount++;
        }
      }

      return {
        status: STATUS_CODES.SUCCESS,
        data: {
          totalFound: problematicRecords.length + potentiallyProblematic.length,
          cleaned: cleanedCount,
          sampleRecords: allRecords.map(r => ({ id: r.id, text: r.point_text }))
        },
        message: `Successfully cleaned ${cleanedCount} out of ${problematicRecords.length + potentiallyProblematic.length} problematic records.`
      };
    } catch (error) {
      console.error("Error cleaning existing records:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get qualifications method
  // Get qualifications method
  static async getQualifications(
    qualificationId: number | string,
    userData: userAuthenticationData,
    learnerId?: number | string,
    assessmentId?: number | string
  ): Promise<any> {
    try {
      // Build unit where condition
      let unitWhereCondition: any = {
        qualification_id: qualificationId
      };

      // Fetch assessment units if assessmentId is provided
      if (assessmentId) {
        const assessmentData = await AssessmentUnits.findAll({
          where: { assessment_id: assessmentId },
          attributes: ['unit_id'],
          raw: true
        });

        const unitIds = assessmentData.map((item) => item.unit_id);
        if (unitIds.length > 0) {
          unitWhereCondition.id = unitIds;
        }
      }

      // Fetch units with nested relationships in one query
      const units = await Units.findAll({
        where: unitWhereCondition,
        include: [
          {
            model: MainOutcomes,
            as: "mainOutcomes",
            include: [
              {
                model: SubOutcomes,
                as: "subOutcomes",
                include: [
                  {
                    model: OutcomeSubpoints,
                    as: "outcomeSubpoints",
                  },
                ],
              }
            ]
          },
          {
            model: Category,
            as: "category",
          },
        ],
        order: [
          ["unit_number", "ASC"],
          [{ model: MainOutcomes, as: "mainOutcomes" }, "main_number", "ASC"],
        ],
      });

      // Early return if no units found
      if (!units || units.length === 0) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: { units: [] },
          message: "Qualifications retrieved successfully.",
        };
      }

      // Batch fetch sampling data if learnerId is provided
      let samplingMap = new Map();
      if (learnerId) {
        const unitIds = units.map(unit => unit.id);
        const samplingData = await UserUnits.findAll({
          where: {
            unit_id: unitIds,
            user_id: learnerId
          },
          attributes: ["unit_id", "is_sampling", "is_assigned"],
          raw: true
        });
        samplingData.forEach(item => {
          samplingMap.set(item.unit_id, { is_sampling: item.is_sampling, is_assigned: item.is_assigned });
        });
      }

      // Build result structure with parallel processing for marks
      const result = {
        units: await Promise.all(units.map(async (unit) => {
          //@ts-ignore
          const mainOutcomes = await Promise.all((unit.mainOutcomes || []).map(async (mainOutcome) => {
            // Build main outcome entry
            const mainOutcomeEntry: any = {
              id: mainOutcome.id,
              main_number: mainOutcome.main_number,
              description: mainOutcome.description,
              marks: mainOutcome.marks || "0",
            };

            // Add main outcome marks if learnerId is provided
            if (learnerId) {
              // You might want to add logic here to get main outcome marks if needed
              // For now, we'll use the default marks from the main outcome
              mainOutcomeEntry.outcome_marks = "0";
              mainOutcomeEntry.max_outcome_marks = mainOutcome.marks || "0";
            } else {
              mainOutcomeEntry.outcome_marks = "0";
              mainOutcomeEntry.max_outcome_marks = mainOutcome.marks || "0";
            }

            // Process sub outcomes for this main outcome
            const subOutcomes = await Promise.all((mainOutcome.subOutcomes || []).map(async (subOutcome) => {
              // Parse outcome number
              const [sectionNumber, outcomeNumber] = subOutcome.outcome_number.split(".");
              const numericSection = parseInt(sectionNumber, 10).toString();
              const numericOutcome = parseInt(outcomeNumber, 10).toString();
              const fullOutcomeNumber = `${numericSection}.${numericOutcome}`;

              // Build sub outcome entry
              const subOutcomeEntry: any = {
                number: fullOutcomeNumber,
                description: subOutcome.description,
                id: subOutcome.id,
              };

              // Add sub outcome marks
              if (learnerId) {
                const outcomeMarksData = await this.getOutcomeMarksFromAssessment(
                  subOutcome.id,
                  learnerId,
                  qualificationId,
                  assessmentId
                );
                subOutcomeEntry.outcome_marks = outcomeMarksData?.total_marks || "0";
                subOutcomeEntry.max_outcome_marks = outcomeMarksData?.max_marks || subOutcome.marks || "0";
              } else {
                subOutcomeEntry.outcome_marks = "0";
                subOutcomeEntry.max_outcome_marks = subOutcome.marks || "0";
              }

              // Add subpoints if they exist
              if (subOutcome.outcomeSubpoints && subOutcome.outcomeSubpoints.length) {
                // Keep existing subPoints for backward compatibility
                subOutcomeEntry.subPoints = subOutcome.outcomeSubpoints.map(p => p.point_text);

                // Add new sub_points with marks (parallel processing)
                if (learnerId) {
                  subOutcomeEntry.sub_points = await Promise.all(
                    subOutcome.outcomeSubpoints.map(async (p) => {
                      const latestMarkData = await this.getLatestAssessmentMark(
                        p.id,
                        learnerId,
                        qualificationId,
                        assessmentId
                      );

                      return {
                        id: p.id,
                        point_text: p.point_text,
                        mark: latestMarkData?.marks || "0",
                        max_marks: latestMarkData?.max_marks || p.marks || "0"
                      };
                    })
                  );
                } else {
                  subOutcomeEntry.sub_points = subOutcome.outcomeSubpoints.map((p) => ({
                    id: p.id,
                    point_text: p.point_text,
                    mark: "0",
                    max_marks: p.marks || "0"
                  }));
                }
              }

              return subOutcomeEntry;
            }));

            // Sort sub outcomes
            subOutcomes.sort((a, b) => this.compareOutcomeNumbers(a.number, b.number));

            // Add sub outcomes to main outcome
            mainOutcomeEntry.sub_outcomes = subOutcomes;

            return mainOutcomeEntry;
          }));

          // Sort main outcomes
          mainOutcomes.sort((a, b) => a.main_number.localeCompare(b.main_number));

          return {
            id: unit.id,
            unitTitle: unit.unit_title,
            unitNumber: unit.unit_number,
            category: unit.category?.category_name || null,
            category_id: unit.category?.id || null,
            is_mandatory: unit.category?.is_mandatory || false,
            unit_number: unit.unit_number,
            main_outcomes: mainOutcomes,
            isSampling: learnerId ? Boolean(samplingMap.get(unit.id)?.is_sampling) : false,
            is_assigned: learnerId ? Boolean(samplingMap.get(unit.id)?.is_assigned) : false,
          };
        }))
      };

      return {
        status: STATUS_CODES.SUCCESS,
        data: result,
        message: "Qualifications retrieved successfully.",
      };
    } catch (error) {
      console.error("Error retrieving qualifications:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Helper method to get the latest assessment mark for a specific subpoint and learner
  private static async getLatestAssessmentMark(
    subpointId: number,
    learnerId: number | string,
    qualificationId: number | string,
    assessmentId?: number | string
  ): Promise<{ marks: string | null; max_marks: string | null } | null> {
    try {
      // Import AssessmentMarks model dynamically to avoid circular dependencies
      const AssessmentMarks = require("../../database/schema/assessment_marks").default;
      let assessmentWhere: any = {
        subpoint_id: subpointId,
        learner_id: learnerId,
        qualification_id: qualificationId,
        deletedAt: null
      };
      if (assessmentId) {
        assessmentWhere.assessment_id = assessmentId;
      }
      const latestMark = await AssessmentMarks.findOne({
        where: assessmentWhere,
        order: [["marks", "DESC"]], // Get the most recent mark
        attributes: ["marks", "max_marks"]
      });

      return latestMark ? {
        marks: latestMark.marks,
        max_marks: latestMark.max_marks
      } : null;
    } catch (error) {
      console.error("Error fetching assessment mark:", error);
      return null;
    }
  }

  // Helper method to get outcome-level marks from assessment_marks table
  private static async getOutcomeMarksFromAssessment(
    outcomeId: number,
    learnerId: number | string,
    qualificationId: number | string,
    assessmentId?: number | string
  ): Promise<{ total_marks: string | null; max_marks: string | null } | null> {
    try {
      // Import AssessmentMarks model dynamically to avoid circular dependencies
      const AssessmentMarks = require("../../database/schema/assessment_marks").default;

      let assessmentWhere: any = {
        sub_outcome_id: outcomeId,
        subpoint_id: null,
        learner_id: learnerId,
        qualification_id: qualificationId,
        deletedAt: null,
      };
      if (assessmentId) {
        assessmentWhere.assessment_id = assessmentId;
      }
      // Get all assessment marks for this outcome, learner, and qualification
      const assessmentMarks = await AssessmentMarks.findOne({
        where: assessmentWhere,
        order: [["marks", "DESC"]],
        attributes: ["marks", "max_marks", "attempt"]
      })

      if (!assessmentMarks) {
        return null;
      }

      // Calculate total marks and max marks
      let totalMarks = parseFloat(assessmentMarks.marks || "0");
      let maxMarks = parseFloat(assessmentMarks.max_marks || "0");
      return {
        total_marks: totalMarks.toString(),
        max_marks: maxMarks.toString()
      };
    } catch (error) {
      console.error("Error fetching outcome marks from assessment:", error);
      return null;
    }
  }

  static compareOutcomeNumbers(a: string, b: string): number {
    const [a1, a2] = a.split(".").map(Number);
    const [b1, b2] = b.split(".").map(Number);
    return a1 - b1 || a2 - b2;
  }

  // Get qualifications list method
  static async getQualificationsList(
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

      // User Qualifications Management
      let userQualificationCondition: any = {
        deletedAt: null,
      };
      let userQualificationRequired = false;
      if (data?.user_id) {
        userQualificationCondition.user_id = data.user_id;
        userQualificationRequired = true;
      }

      let search = data?.search || "";

      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { qualification_no: { [Op.like]: `%${search}%` } },
          ]
        };
      }

      let qualifications = await Qualifications.findAndCountAll({
        where: {
          ...searchOptions,
          deletedAt: null
        },
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        include: [
          {
            model: UserQualification,
            as: "userQualifications",
            required: userQualificationRequired,
            where: userQualificationCondition,
            attributes: [],
          },
        ],
        order,
        distinct: true,
      });

      qualifications = JSON.parse(JSON.stringify(qualifications));

      const pagination = await paginate(qualifications, limit, page, fetchAll);

      const response = {
        data: qualifications.rows,
        pagination: pagination,
      };

      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Qualifications list retrieved successfully.",
      };
    } catch (error) {
      console.error("Error retrieving qualifications list:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Qualification
  static async deleteQualification(
    qualificationId: string | number,
    userData: userAuthenticationData
  ) {
    try {
      let qualification = await Qualifications.findById(+qualificationId);
      if (!qualification) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Invalid Qualification",
        };
      }
      // Validate if qualification is used by any learner or assessor
      let isUsed = await UserQualification.findOne({
        where: { qualification_id: qualificationId },
        attributes: ["id"],
      });
      if (isUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification is used by a learner or assessor",
        };
      }
      let deleteQualification = await Qualifications.destroy({
        where: { id: qualificationId },
        force: true,
      });
      let deleteUnit = await Units.destroy({
        where: { qualification_id: qualificationId },
        force: true,
      });
      const outComes = await SubOutcomes.findAll({
        where: { qualification_id: qualificationId, deletedAt: null },
        attributes: ["id"],
      });
      const outComeIds = outComes.map((data) => data.id);
      let deleteSubOutComes = await SubOutcomes.destroy({
        where: { qualification_id: qualificationId },
        force: true,
      });
      let deleteOutComeSubPoints = await OutcomeSubpoints.destroy({
        where: { outcome_id: { [Op.in]: outComeIds } },
        force: true,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Qualification deleted successfully",
      };
    } catch (error) {
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Update Qualification
  static async updateQualification(
    qualificationId: string | number,
    userData: userAuthenticationData,
    file
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      if (!file || !file.buffer || file.size === 0) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Please upload a valid file.",
        };
      }

      // Read workbook
      const workbook = XLSX.read(file.buffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[sheetName];

      const qualificationName = firstSheet["B1"]?.v?.toString().trim() || "";
      const qualificationNumber = firstSheet["B2"]?.v?.toString().trim() || "";

      if (!qualificationName || !qualificationNumber) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification name or number is missing in the Excel file.",
        };
      }

      // Optional: check if the qualification you're replacing exists
      const existing = await Qualifications.findByPk(qualificationId);
      if (!existing) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification not found.",
        };
      }

      // Delete previous main outcomes
      await MainOutcomes.destroy({
        where: { qualification_id: qualificationId },
        force: true,
        transaction,
      });

      // Delete previous related data (force delete)
      await OutcomeSubpoints.destroy({
        where: {
          outcome_id: {
            [Op.in]: Sequelize.literal(
              `(SELECT id FROM tbl_sub_outcomes WHERE qualification_id = ${qualificationId})`
            ),
          },
        },
        force: true,
        transaction,
      });

      await SubOutcomes.destroy({
        where: { qualification_id: qualificationId },
        force: true,
        transaction,
      });

      await Units.destroy({
        where: { qualification_id: qualificationId },
        force: true,
        transaction,
      });

      await Qualifications.update(
        {
          name: qualificationName,
          qualification_no: qualificationNumber,
        },
        {
          where: { id: qualificationId },
          transaction,
        }
      );
      const qualificationData = await Qualifications.findByPk(qualificationId, {
        transaction,
      });

      // Now insert new data using modified createQualification that accepts workbook + transaction
      const created = await this._createQualificationWithWorkbook(
        workbook,
        userData,
        transaction,
        qualificationData.id
      );
      if (created && created.status && created.status !== 200) {
        await transaction.rollback()
        return {
          status: created.status,
          message: created.message
        }
      }
      // upload file on AWS
      const extension = extname(file.originalname);
      const fileName = qualificationName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
      const mainFileName = `${fileName}${extension}`;
      let qualification_file = await uploadFileOnAWSDownloadable(file, mainFileName)
      // update in database
      await Qualifications.update({ qualification_file }, { where: { id: qualificationData.id }, transaction })
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: created.data,
        message: "Qualification updated successfully.",
      };
    } catch (error) {
      console.error("Error updating qualification:", error);
      if (!transaction.finished) await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
  private static async _createQualificationWithWorkbook(
    workbook: XLSX.WorkBook,
    userData: userAuthenticationData,
    transaction: any,
    existingQualificationId?: number
  ): Promise<any> {
    const sheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[sheetName];
    const qualificationName = firstSheet["B1"]?.v?.toString().trim() || "";
    const qualificationNumber = firstSheet["B2"]?.v?.toString().trim() || "";

    let qualificationData;

    if (existingQualificationId) {
      // already exists → just reuse
      qualificationData = await Qualifications.findByPk(
        existingQualificationId,
        { transaction }
      );
    } else {
      // creating fresh qualification
      qualificationData = await Qualifications.create(
        {
          name: qualificationName,
          qualification_no: qualificationNumber,
          created_by: userData.id,
        },
        { transaction }
      );
      existingQualificationId = qualificationData.id
    }

    // Track processed unit_ref_no values within this Excel file to detect duplicates
    const processedUnitRefNos = new Map<string, string>(); // Map<unit_ref_no, sheetName>
    let category_id_created = []; // Track the id of the category that was created
    let hasMandatoryUnit = false; // Track if at least one mandatory unit exists

    for (const sheetName of workbook.SheetNames) {
      // if (!sheetName.toLowerCase().startsWith("unit")) continue;
      if (sheetName.toLowerCase() === "front page" || sheetName.toLowerCase() === "frontpage") continue;
      const sheet = workbook.Sheets[sheetName];

      const unitNo = sheet["B1"]?.v?.toString().trim() || "";
      const unitName = sheet["B2"]?.v?.toString().trim() || "";
      const unitRefNo = sheet["B3"]?.v?.toString().trim() || "";
      const category = sheet["B4"]?.v?.toString().trim() || "";
      const isMandatory = (sheet["B5"]?.v?.toString().trim() || "") === "Yes" ? true : false;

      if (isMandatory) {
        hasMandatoryUnit = true;
      }

      if (!unitRefNo) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: `Unit Reference Number is missing for unit ${unitNo} in sheet '${sheetName}'`,
        };
      }

      // Check for duplicate unit_ref_no within the Excel file
      if (processedUnitRefNos.has(unitRefNo)) {
        const duplicateSheetName = processedUnitRefNos.get(unitRefNo);
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: `Duplicate Unit Reference Number '${unitRefNo}' found in Excel file. First occurrence in sheet '${duplicateSheetName}' (Unit ${unitNo}), duplicate in sheet '${sheetName}' (Unit ${unitNo}). Please remove the duplicate.`,
        };
      }

      // Mark this unit_ref_no as processed
      processedUnitRefNos.set(unitRefNo, sheetName);

      // Check if unit_ref_no already exists in database
      const existingUnit = await Units.findOne({
        where: { unit_ref_no: unitRefNo, deletedAt: null },
        attributes: ["id"],
        transaction,
      });

      if (existingUnit) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: `Unit Reference Number '${unitRefNo}' already exists in database for unit ${unitNo}`,
        };
      }

      let categoryId: number | null = null;
      let categoryData = await Category.findOne({
        where: {
          category_name: {
            [Op.like]: category
          }
        },
      });
      if (categoryData) {
        if (categoryData.is_mandatory !== isMandatory) {
          // await transaction.rollback();
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Category already exists but is mandatory is different. Please update the category mandatory status."
          }
        }
        categoryId = categoryData.id;
      } else {
        categoryData = await Category.create({ category_name: category, is_mandatory: isMandatory });
        categoryId = categoryData.id;
        category_id_created.push(categoryData.id);
      }
      const unitData = await Units.create(
        {
          qualification_id: qualificationData.id,
          unit_title: unitName,
          unit_number: unitNo,
          unit_ref_no: unitRefNo,
          category_id: categoryId,
          created_by: userData.id,
        },
        { transaction }
      );

      const range = XLSX.utils.decode_range(sheet["!ref"] || "");
      let currentSubOutcomeId: number | null = null;
      let currentMainOutcomeId: number | null = null;
      for (let row = 6; row <= range.e.r; row++) {
        const codeCell = sheet[XLSX.utils.encode_cell({ c: 0, r: row })];
        const descCell = sheet[XLSX.utils.encode_cell({ c: 1, r: row })];

        const code = codeCell?.v?.toString().trim();
        const description = descCell?.v?.toString().trim();

        if (code && /^[0-9]+(\.0+)*$/.test(code)) {
          const mainOutcome = await MainOutcomes.create({
            unit_id: unitData.id,
            qualification_id: qualificationData.id,
            main_number: code,
            description: description || "",
            created_by: userData.id,
          }, { transaction });
          currentMainOutcomeId = mainOutcome.id;
        } else if (code && /^[0-9]+\.[0-9]+$/.test(code)) {
          const subOutCome = await SubOutcomes.create(
            {
              unit_id: unitData.id,
              qualification_id: qualificationData.id,
              description: description || "",
              outcome_number: code,
              created_by: userData.id,
              main_outcome_id: currentMainOutcomeId,
            },
            { transaction }
          );
          currentSubOutcomeId = subOutCome.id;
        } else if (currentSubOutcomeId && !code && description) {
          const cleanedDescription = this.cleanDescriptionText(description);

          // Only create SubPoints if the cleaned description is not empty
          if (cleanedDescription && cleanedDescription.length > 0) {
            await OutcomeSubpoints.create(
              {
                outcome_id: currentSubOutcomeId,
                point_text: cleanedDescription,
                created_by: userData.id,
              },
              { transaction }
            );
          }
        }
      }
    }

    if (!hasMandatoryUnit) {
      /**
       * Need to delete the category that was created if it was created
       * because category is created and we can not add transection in category model
       * for that reason we are deleting the category that was created if it was created
       * and if we did not delete then if user try to add another qualification with same category then it will give error
       */
      if (category_id_created.length > 0) {
        await Category.destroy({ where: { id: { [Op.in]: category_id_created } }, force: true });
      }
      return {
        status: STATUS_CODES.BAD_REQUEST,
        message: "At least one mandatory unit is required in the Excel file.",
      };
    }

    return {
      status: STATUS_CODES.SUCCESS,
      message: "Success",
      data: qualificationData
    };
  }

  static async getCategoryByQualification(
    data: any,
    qualificationId: number | string,
    userData: userAuthenticationData,
    learnerId?: number | string,
    assessmentId?: number | string
  ): Promise<any> {
    try {
      // Build unit where condition
      let unitWhereCondition: any = {
        qualification_id: qualificationId
      };

      // Fetch assessment units if assessmentId is provided
      if (assessmentId) {
        const assessmentData = await AssessmentUnits.findAll({
          where: { assessment_id: assessmentId },
          attributes: ['unit_id'],
          raw: true
        });

        const unitIds = assessmentData.map((item) => item.unit_id);
        if (unitIds.length > 0) {
          unitWhereCondition.id = unitIds;
        }
      }

      // Fetch units with nested relationships in one query
      const units = await Units.findAll({
        where: unitWhereCondition,
        include: [
          {
            model: MainOutcomes,
            as: "mainOutcomes",
            include: [
              {
                model: SubOutcomes,
                as: "subOutcomes",
                include: [
                  {
                    model: OutcomeSubpoints,
                    as: "outcomeSubpoints",
                  },
                ],
              }
            ]
          },
          {
            model: Category,
            as: "category",
          },
        ],
        order: [
          ["unit_number", "ASC"],
          [{ model: MainOutcomes, as: "mainOutcomes" }, "main_number", "ASC"],
        ],
      });

      // Early return if no units found
      if (!units || units.length === 0) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: { units: [] },
          message: "Qualifications retrieved successfully.",
        };
      }

      // Batch fetch sampling data if learnerId is provided
      let samplingMap = new Map();
      if (learnerId) {
        const unitIds = units.map(unit => unit.id);
        const samplingData = await UserUnits.findAll({
          where: {
            unit_id: unitIds,
            user_id: learnerId
          },
          attributes: ["unit_id", "is_sampling", "is_assigned"],
          raw: true
        });
        samplingData.forEach(item => {
          samplingMap.set(item.unit_id, { is_sampling: item.is_sampling, is_assigned: item.is_assigned });
        });
      }

      // Format units and include marks when learnerId is present
      const formattedUnits = await Promise.all(units.map(async (unit) => {
        // For each main outcome, for each subOutcome and each subpoint, attach marks if learnerId is provided
        // @ts-ignore
        const main_outcomes = await Promise.all((unit.mainOutcomes || []).map(async (main) => {
          const mainEntry: any = {
            id: main.id,
            main_number: main.main_number,
            description: main.description,
            marks: main.marks || "0",
            outcome_marks: "0",
            max_outcome_marks: main.marks || "0",
            sub_outcomes: []
          };

          // Process sub outcomes
          const subOutcomesProcessed = await Promise.all((main.subOutcomes || []).map(async (sub) => {
            // parse number safely (keep compatibility with older format)
            const outcomeNumberParts = (sub.outcome_number || sub.number || "").toString().split(".");
            const numericSection = outcomeNumberParts[0] ? parseInt(outcomeNumberParts[0], 10).toString() : "0";
            const numericOutcome = outcomeNumberParts[1] ? parseInt(outcomeNumberParts[1], 10).toString() : "0";
            const fullOutcomeNumber = `${numericSection}.${numericOutcome}`;

            const subEntry: any = {
              id: sub.id,
              number: fullOutcomeNumber,
              description: sub.description,
              outcome_marks: "0",
              max_outcome_marks: sub.marks || "0",
              sub_points: []
            };

            if (learnerId) {
              // get outcome marks (uses your existing helper)
              try {
                const outcomeMarksData = await this.getOutcomeMarksFromAssessment(
                  sub.id,
                  learnerId,
                  qualificationId,
                  assessmentId
                );
                subEntry.outcome_marks = outcomeMarksData?.total_marks || "0";
                subEntry.max_outcome_marks = outcomeMarksData?.max_marks || sub.marks || "0";
              } catch (err) {
                // fallback to defaults on error
                subEntry.outcome_marks = "0";
                subEntry.max_outcome_marks = sub.marks || "0";
              }
            } else {
              subEntry.outcome_marks = "0";
              subEntry.max_outcome_marks = sub.marks || "0";
            }

            // Process subpoints
            const subPointsProcessed = await Promise.all((sub.outcomeSubpoints || []).map(async (point) => {
              const subPointEntry: any = {
                id: point.id,
                point_text: point.point_text,
                mark: "0",
                max_marks: point.marks || point.max_marks || "0"
              };

              if (learnerId) {
                try {
                  const latestMarkData = await this.getLatestAssessmentMark(
                    point.id,
                    learnerId,
                    qualificationId,
                    assessmentId
                  );
                  subPointEntry.mark = latestMarkData?.marks || "0";
                  subPointEntry.max_marks = latestMarkData?.max_marks || point.marks || point.max_marks || "0";
                } catch (err) {
                  subPointEntry.mark = "0";
                  subPointEntry.max_marks = point.marks || point.max_marks || "0";
                }
              } else {
                subPointEntry.mark = "0";
                subPointEntry.max_marks = point.marks || point.max_marks || "0";
              }

              return subPointEntry;
            }));

            subEntry.sub_points = subPointsProcessed;
            // maintain backward-compatible property name too
            subEntry.subPoints = (sub.outcomeSubpoints || []).map(p => p.point_text);

            return subEntry;
          }));

          // sort subOutcomes by their numeric outcome number if needed (reuse existing helper if available)
          if (this.compareOutcomeNumbers) {
            subOutcomesProcessed.sort((a, b) => this.compareOutcomeNumbers(a.number, b.number));
          } else {
            subOutcomesProcessed.sort((a, b) => a.number.localeCompare(b.number));
          }

          mainEntry.sub_outcomes = subOutcomesProcessed;
          return mainEntry;
        }));

        return {
          id: unit.id,
          unitTitle: unit.unit_title,
          unitNumber: unit.unit_number,
          is_mandatory: !!unit.category?.is_mandatory,
          isSampling: !!samplingMap.get(unit.id)?.is_sampling,
          is_assigned: !!samplingMap.get(unit.id)?.is_assigned,
          main_outcomes,
          category_id: unit.category?.id || null,
          category: unit.category?.category_name || "Uncategorized",
        };
      }));

      let filteredUnits = formattedUnits;
      if (data.is_assign == 1) {
        filteredUnits = formattedUnits.filter(unit => !!unit.is_assigned);
      }

      // Step 5: Group by category
      const categoryMap = new Map<number, any>();

      for (const unit of filteredUnits) {
        const catId = unit.category_id || 0;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            category_id: catId,
            category: unit.category,
            units: [],
          });
        }
        categoryMap.get(catId).units.push({
          id: unit.id,
          unitTitle: unit.unitTitle,
          unitNumber: unit.unitNumber,
          is_mandatory: unit.is_mandatory,
          isSampling: unit.isSampling,
          is_assigned: unit.is_assigned,
          main_outcomes: unit.main_outcomes,
        });
      }

      let result;
      if (data.categorywise_unit_data == 1) {
        let qualification = await Qualifications.findOne({
          where: { id: qualificationId },
          attributes: ["id", "name", "qualification_no"]
        });
        qualification = JSON.parse(JSON.stringify(qualification));
        let userQualification
        if (learnerId) {
          userQualification = await UserQualification.findOne({
            where: { user_id: learnerId, qualification_id: qualificationId },
            attributes: ["is_signed_off", "is_optional_assigned"]
          });
        }
        result = {
          qualification_id: qualification.id,
          qualification_name: qualification.name,
          qualification_no: qualification.qualification_no,
          is_signed_off: userQualification?.is_signed_off || false,
          is_optional_assigned: userQualification?.is_optional_assigned || false,
          categorywise_unit_data: Array.from(categoryMap.values())
        };
      } else {
        result = Array.from(categoryMap.values());
      }

      // Step 6: Return final grouped response
      return {
        status: STATUS_CODES.SUCCESS,
        data: result,
        message: "Qualification categories and units retrieved successfully.",
      };
    } catch (error) {
      console.error("Error retrieving qualifications:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Qualification List
  static async unitList(data: any, userData: userAuthenticationData) {
    try {
      const qualificationData = await Qualifications.findOne({
        where: { id: data.qualification_id, deletedAt: null },
      });

      if (!qualificationData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification not found",
        };
      }

      // Get user qualification details
      const userQualification = await UserQualification.findOne({
        where: {
          qualification_id: qualificationData.id,
          user_id: data.learner_id,
          deletedAt: null,
        },
        attributes: ["is_signed_off", "is_optional_assigned"],
      });

      // Fetch units
      const units = await Units.findAll({
        where: { qualification_id: qualificationData.id, deletedAt: null },
        attributes: ["id", "unit_title", "unit_number", "category_id"],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "category_name"],
          },
        ],
      });

      // Fetch user-unit mappings
      const userUnits = await UserUnits.findAll({
        where: {
          user_id: data.learner_id,
          unit_id: { [Op.in]: units.map((u: any) => u.id) },
          deletedAt: null,
        },
        attributes: ["unit_id", "is_assigned"],
      });

      // Helper: check if a unit is assigned
      const isUnitAssigned = (unitId: number) =>
        userUnits.some(
          (uu: any) => uu.unit_id === unitId && uu.is_assigned === true
        );

      // Determine logic type
      const categorywise = parseInt(data.categorywise_record) === 1;
      const filterAssigned = parseInt(data.is_assigned) === 1;

      let responseObject: any;

      if (categorywise) {
        // === CATEGORY-WISE LOGIC ===
        const categoryMap = new Map();

        for (const unit of units) {
          const assigned = isUnitAssigned(unit.id);
          if (filterAssigned && !assigned) continue; // skip unassigned units if filter is active

          const categoryId = unit.category_id || 0;
          const categoryName = unit.category?.category_name || "Uncategorized";

          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              category_id: categoryId,
              category_name: categoryName,
              units: [],
            });
          }

          categoryMap.get(categoryId).units.push({
            id: unit.id,
            unitTitle: unit.unit_title,
            unitNumber: unit.unit_number,
            is_assigned: assigned,
          });
        }

        responseObject = {
          qualification_id: qualificationData.id,
          qualification_name: qualificationData.name,
          qualification_no: qualificationData.qualification_no,
          is_signed_off: userQualification?.is_signed_off || false,
          is_optional_assigned:
            userQualification?.is_optional_assigned || false,
          categories: Array.from(categoryMap.values()),
        };
      } else {
        // === FLAT UNIT LIST LOGIC ===
        const unitList: any[] = [];

        for (const unit of units) {
          const assigned = isUnitAssigned(unit.id);
          if (filterAssigned && !assigned) continue; // skip unassigned units if filter is active

          unitList.push({
            id: unit.id,
            unitTitle: unit.unit_title,
            unitNumber: unit.unit_number,
            category_id: unit.category_id,
            category: unit.category?.category_name || null,
            is_assigned: assigned,
          });
        }

        responseObject = {
          qualification_id: qualificationData.id,
          qualification_name: qualificationData.name,
          qualification_no: qualificationData.qualification_no,
          is_signed_off: userQualification?.is_signed_off || false,
          is_optional_assigned:
            userQualification?.is_optional_assigned || false,
          units: unitList,
        };
      }

      return {
        status: STATUS_CODES.SUCCESS,
        data: responseObject,
        message: "Qualification list fetched successfully",
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

export default qualificationService;
