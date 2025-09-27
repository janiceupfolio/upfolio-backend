require("dotenv").config();
import { userAuthenticationData } from "../../interface/user";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import XLSX from "xlsx";
import Qualifications from "../../database/schema/qualifications";
import Units from "../../database/schema/units";
import SubOutcomes from "../../database/schema/sub_outcomes";
import OutcomeSubpoints from "../../database/schema/outcome_subpoints";
import { Op, Order, Sequelize } from "sequelize";
import { paginate, qualificationUserId } from "../../helper/utils";
import UserQualification from "../../database/schema/user_qualification";
import Assessment from "../../database/schema/assessment";
import AssessmentUnits from "../../database/schema/assessment_units";
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
    const transaction = await sequelize.transaction();
    try {
      if (!file || !file.buffer || file.size === 0) {
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
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification Number Already Exist",
        };
      }
      // Validate extracted data
      if (!qualificationName || !qualificationNumber) {
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
      for (const sheetName of workbook.SheetNames) {
        if (!sheetName.toLowerCase().startsWith("unit")) continue;
        // Process each unit sheet
        const sheet = workbook.Sheets[sheetName];
        const unitNo = sheet["B1"]?.v?.toString().trim() || "";
        const unitName = sheet["B2"]?.v?.toString().trim() || "";
        const unitRefNo = sheet["B3"]?.v?.toString().trim() || "";
        if (!unitRefNo) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: `Unit Reference Number is missing for unit ${unitNo}`,
          };
        }

        const existingUnit = await Units.findOne({
          where: { unit_ref_no: unitRefNo, deletedAt: null },
          attributes: ["id"],
        });

        if (existingUnit) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: `Unit Reference Number already exists: ${unitNo}`,
          };
        }
        // create unit
        let unitData = await Units.create(
          {
            qualification_id: qualificationData.id,
            unit_title: unitName,
            unit_number: unitNo,
            unit_ref_no: unitRefNo,
            created_by: userData.id,
          },
          { transaction }
        );
        // Extract sub outcome data
        const range = XLSX.utils.decode_range(sheet["!ref"] || "");
        let currentSubOutcomeId: number | null = null;
        for (let row = 4; row <= range.e.r; row++) {
          const codeCell = sheet[XLSX.utils.encode_cell({ c: 0, r: row })];
          const descCell = sheet[XLSX.utils.encode_cell({ c: 1, r: row })];

          const code = codeCell?.v?.toString().trim();
          const description = descCell?.v?.toString().trim();

          if (code && /^[0-9]+\.[0-9]+$/.test(code)) {
            // Create SubOutcome
            const subOutCome = await SubOutcomes.create(
              {
                unit_id: unitData.id,
                qualification_id: qualificationData.id,
                description: description || "",
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
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
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
  static async getQualifications(
    qualificationId: number | string,
    userData: userAuthenticationData,
    learnerId?: number | string,
    assessmentId?: number | string
  ): Promise<any> {
    try {
      let unitWhereCondition: any = {
        qualification_id: qualificationId
      }
      if (assessmentId) {
        let assessmentData = await AssessmentUnits.findAll({
          where: { assessment_id: assessmentId }
        })
        let unitIds = assessmentData.map((item) => item.unit_id);
        if (unitIds.length > 0) {
          unitWhereCondition.id = unitIds; // Sequelize auto treats array as IN
        }
      }
      const units = await Units.findAll({
        where: unitWhereCondition,
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
            order: [["outcome_number", "ASC"]],
          },
        ],
        order: [["unit_number", "ASC"]],
      });

      const result = {
        units: [],
      };

      for (const unit of units) {
        const outcomes = [];
        //@ts-ignore
        for (const outcome of unit.subOutcomes || []) {
          const [sectionNumber, outcomeNumber] =
            outcome.outcome_number.split(".");
          const numericSection = parseInt(sectionNumber, 10).toString();
          const numericOutcome = parseInt(outcomeNumber, 10).toString();
          const fullOutcomeNumber = `${numericSection}.${numericOutcome}`;

          const outcomeEntry: any = {
            number: fullOutcomeNumber,
            description: outcome.description,
            id: outcome.id,
          };

          // Add outcome_marks - either from assessment_marks (if learner_id provided) or from SubOutcomes table
          if (learnerId) {
            const outcomeMarksData = await this.getOutcomeMarksFromAssessment(
              outcome.id,
              learnerId,
              qualificationId,
              assessmentId
            );
            outcomeEntry.outcome_marks = outcomeMarksData?.total_marks || "0";
            outcomeEntry.max_outcome_marks = outcomeMarksData?.max_marks || outcome.marks || "0";
          } else {
            outcomeEntry.outcome_marks = "0";
            outcomeEntry.max_outcome_marks = outcome.marks || "0";
          }

          if (outcome.outcomeSubpoints && outcome.outcomeSubpoints.length) {
            // Keep existing subPoints for backward compatibility
            outcomeEntry.subPoints = outcome.outcomeSubpoints.map(
              (p) => p.point_text
            );

            // Add new sub_points with id and mark if learner_id is provided
            if (learnerId) {
              outcomeEntry.sub_points = await Promise.all(
                outcome.outcomeSubpoints.map(async (p) => {
                  // Get the latest assessment mark for this specific subpoint and learner
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
                    max_marks: latestMarkData?.max_marks || p.marks || "0" // Use assessment max_marks if available, otherwise fallback to subpoint marks
                  };
                })
              );
            } else {
              // If no learner_id, just provide the structure without marks
              outcomeEntry.sub_points = outcome.outcomeSubpoints.map((p) => ({
                id: p.id,
                point_text: p.point_text,
                mark: "0",
                max_marks: p.marks || "0" // Add max marks from OutcomeSubpoints table
              }));
            }
          }

          outcomes.push(outcomeEntry);
        }

        outcomes.sort((a, b) => this.compareOutcomeNumbers(a.number, b.number));

        result.units.push({
          id: unit.id,
          unitTitle: unit.unit_title,
          unitNumber: unit.unit_number,
          outcomes, // 🔁 directly attached here
        });
      }

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
      let sort_order = data?.sort_order || "ASC";
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

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: created,
        message: "Qualification updated successfully.",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating qualification:", error);
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
    }

    for (const sheetName of workbook.SheetNames) {
      if (!sheetName.toLowerCase().startsWith("unit")) continue;
      const sheet = workbook.Sheets[sheetName];

      const unitNo = sheet["B1"]?.v?.toString().trim() || "";
      const unitName = sheet["B2"]?.v?.toString().trim() || "";
      const unitRefNo = sheet["B3"]?.v?.toString().trim() || "";

      const unitData = await Units.create(
        {
          qualification_id: qualificationData.id,
          unit_title: unitName,
          unit_number: unitNo,
          unit_ref_no: unitRefNo,
          created_by: userData.id,
        },
        { transaction }
      );

      const range = XLSX.utils.decode_range(sheet["!ref"] || "");
      let currentSubOutcomeId: number | null = null;

      for (let row = 4; row <= range.e.r; row++) {
        const codeCell = sheet[XLSX.utils.encode_cell({ c: 0, r: row })];
        const descCell = sheet[XLSX.utils.encode_cell({ c: 1, r: row })];

        const code = codeCell?.v?.toString().trim();
        const description = descCell?.v?.toString().trim();

        if (code && /^[0-9]+\.[0-9]+$/.test(code)) {
          const subOutCome = await SubOutcomes.create(
            {
              unit_id: unitData.id,
              qualification_id: qualificationData.id,
              description: description || "",
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

    return qualificationData;
  }
}

export default qualificationService;
