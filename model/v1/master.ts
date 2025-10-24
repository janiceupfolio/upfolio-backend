require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import {
  Roles,
  STATUS_CODES,
  STATUS_MESSAGE,
  ModuleTypes,
} from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { generateSecurePassword, isValidEmail, paginate } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import Role from "../../database/schema/role";
import Center from "../../database/schema/center";
import Methods from "../../database/schema/methods";
import Assessment from "../../database/schema/assessment";
import ModuleRecords from "../../database/schema/modules_records";
import Activity from "../../database/schema/activity";
import Image from "../../database/schema/images";
import UserLearner from "../../database/schema/user_learner";
import UserIQA from "../../database/schema/user_iqa";
import AssessmentMarks from "../../database/schema/assessment_marks";
import OutcomeSubpoints from "../../database/schema/outcome_subpoints";
import SubOutcomes from "../../database/schema/sub_outcomes";
import Units from "../../database/schema/units";
import { TABLE_NAME } from "../../configs/tables";
const { sequelize } = require("../../configs/database");

class MasterService {
  // Get All Roles
  static async getAllRoles(): Promise<any> {
    try {
      // Get All Roles
      const roles = await Role.findAll({
        where: { deletedAt: null },
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: roles,
        message: "Roles fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get All Centers
  static async getAllCenters(): Promise<any> {
    try {
      // Assuming a method exists to fetch centers
      const centers = await Center.findAll({
        where: { deletedAt: null },
        order: [["center_name", "ASC"]] as Order,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: centers,
        message: "Centers fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get All Methods
  static async getAllMethods(): Promise<any> {
    try {
      // Fetch all methods from the database
      const methods = await Methods.findAll({
        where: { deletedAt: null },
        order: [["name", "ASC"]] as Order,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: methods,
        message: "Methods fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Signed Off Qualification
  static async signedOff(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      let userQualification = await UserQualification.findOne({
        where: {
          qualification_id: data.qualification_id,
          user_id: data.learner_id,
        },
      });
      if (!userQualification) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Qualification not found",
        };
      }
      // Check if user has do already signed Off throw an error
      if (userQualification.is_signed_off && data.is_sign_off == 1) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification already signed off",
        };
      }
      await userQualification.update({ is_signed_off: data.is_sign_off });
      let learner_ = await User.findOne({
        where: { id: data.learner_id, deletedAt: null },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            required: false,
            through: { attributes: ["is_signed_off"] }, // prevent including join table info
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
      learner_ = JSON.parse(JSON.stringify(learner_));
      //@ts-ignore
      if (learner_ && learner_.qualifications?.length) {
        //@ts-ignore
        learner_.qualifications = await Promise.all(
          //@ts-ignore
          learner_.qualifications.map(async (q: any) => {
            const { tbl_user_qualification, UserQualification, ...rest } = q; // strip join table objects
            return {
              ...rest,
              is_signed_off:
                tbl_user_qualification?.is_signed_off ??
                UserQualification?.is_signed_off ??
                null,
            };
          })
        );
      }
      return {
        status: STATUS_CODES.SUCCESS,
        data: learner_,
        message: "Qualification signed off successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get Dashboard method
  static async getDashboard(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      if (userData.role !== Roles.ADMIN) {
        return {
          status: STATUS_CODES.SUCCESS,
          message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
          data: {
            overview: {
              totalLearners: {
                value: 0,
                change: 0,
                note: "+0% from last month",
              },
              activeAssessors: { value: 0, change: 0, note: "0 new this week" },
              iqasSupervising: { value: 0, change: 0, note: "All assigned" },
              qualifications: { value: 0, change: 0, note: "0 added recently" },
              totalAssessments: { value: 0, change: 0, note: "+0% this month" },
              completed: { value: 0, rate: 0, note: "0% completion rate" },
              pendingReview: { value: 0, note: "Needs attention" },
              successRate: { value: 0, change: 0, note: "+0% improvement" },
              qualificationSignedOff: {
                value: 0,
                change: 0,
                note: "Qualifications completed",
              },
            },
            monthlyOverview: [],
            statusDistribution: [],
            activityFeed: [],
            modulesFromActivityRecords: [],
          },
        };
      }

      const { Op } = require("sequelize");
      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const startOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
      );

      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfWeek);
      endOfLastWeek.setDate(startOfWeek.getDate() - 1);

      const centerWhereCondition = {
        center_id: userData.center_id,
        deletedAt: null,
      };

      // Pre-fetch valid qualifications
      const validQualificationIds = await UserQualification.findAll({
        attributes: ["qualification_id"],
        where: { is_signed_off: false, deletedAt: null } as any,
        raw: true,
      }).then((results) => results.map((r) => r.qualification_id));

      const assessmentWhereCondition =
        validQualificationIds.length > 0
          ? {
            ...centerWhereCondition,
            qualification_id: { [Op.in]: validQualificationIds },
          }
          : { ...centerWhereCondition, qualification_id: { [Op.in]: [] } };

      // ------------------ Batch 1 (Counts) ------------------
      const [
        totalLearners,
        learnersThisMonth,
        learnersLastMonth,
        activeAssessors,
        assessorsThisWeek,
        assessorsLastWeek,
        iqasSupervising,
        totalAssessments,
        assessmentsThisMonth,
        assessmentsLastMonth,
        completedAssessments,
        pendingReviewAssessments,
      ] = await Promise.all([
        User.count({ where: { role: Roles.LEARNER, ...centerWhereCondition } }),
        User.count({
          where: {
            role: Roles.LEARNER,
            ...centerWhereCondition,
            createdAt: { [Op.gte]: startOfMonth },
          },
        }),
        User.count({
          where: {
            role: Roles.LEARNER,
            ...centerWhereCondition,
            createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] },
          },
        }),
        User.count({
          where: { role: Roles.ASSESSOR, ...centerWhereCondition },
        }),
        User.count({
          where: {
            role: Roles.ASSESSOR,
            ...centerWhereCondition,
            createdAt: { [Op.gte]: startOfWeek },
          },
        }),
        User.count({
          where: {
            role: Roles.ASSESSOR,
            ...centerWhereCondition,
            createdAt: { [Op.between]: [startOfLastWeek, endOfLastWeek] },
          },
        }),
        User.count({ where: { role: Roles.IQA, ...centerWhereCondition } }),
        Assessment.count({ where: assessmentWhereCondition }),
        Assessment.count({
          where: {
            ...assessmentWhereCondition,
            createdAt: { [Op.gte]: startOfMonth },
          },
        }),
        Assessment.count({
          where: {
            ...assessmentWhereCondition,
            createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] },
          },
        }),
        Assessment.count({
          where: { ...assessmentWhereCondition, assessment_status: 4 },
        }),
        Assessment.count({
          where: {
            ...assessmentWhereCondition,
            assessment_status: { [Op.in]: [2, 5] },
          },
        }),
      ]);

      // ------------------ Batch 2 (Aggregates + Activity) ------------------
      const [
        qualifications,
        newQualifications,
        qualificationSignedOff,
        monthlyData,
        statusDistribution,
        recentActivity,
        recentResource,
      ] = await Promise.all([
        // Total assigned qualifications for this center
        sequelize
          .query(
            `
        SELECT COUNT(DISTINCT q.id) as count 
        FROM tbl_qualifications q 
        INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
        INNER JOIN tbl_user u ON uq.user_id = u.id 
        WHERE q.deletedAt IS NULL 
          AND q.status = 1 
          AND uq.deletedAt IS NULL 
          AND u.center_id = :centerId 
          AND u.deletedAt IS NULL
        `,
            {
              replacements: { centerId: userData.center_id },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),

        // New assigned qualifications for this center this month
        sequelize
          .query(
            `
        SELECT COUNT(DISTINCT q.id) as count 
        FROM tbl_qualifications q 
        INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
        INNER JOIN tbl_user u ON uq.user_id = u.id 
        WHERE q.deletedAt IS NULL 
          AND q.status = 1 
          AND uq.deletedAt IS NULL 
          AND u.center_id = :centerId 
          AND u.deletedAt IS NULL
          AND uq.createdAt >= :startOfMonth
        `,
            {
              replacements: { centerId: userData.center_id, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),
        // Signed off qualifications
        sequelize
          .query(
            `
        SELECT COUNT(*) as count 
        FROM tbl_user_qualification uq 
        INNER JOIN tbl_user u ON uq.user_id = u.id 
        WHERE uq.is_signed_off = true 
          AND uq.deletedAt IS NULL 
          AND u.center_id = :centerId 
          AND u.deletedAt IS NULL
      `,
            {
              replacements: { centerId: userData.center_id },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),

        // Monthly Data (raw SQL instead of ORM grouping)
        sequelize.query(
          `
        SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
               COUNT(id) as submissions,
               SUM(CASE WHEN assessment_status = 4 THEN 1 ELSE 0 END) as completions
        FROM tbl_assessment
        WHERE center_id = :centerId
          AND createdAt >= :sixMonthsAgo
          ${validQualificationIds.length > 0
            ? "AND qualification_id IN(:qualificationIds)"
            : ""
          }
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `,
          {
            replacements: {
              centerId: userData.center_id,
              sixMonthsAgo,
              qualificationIds: validQualificationIds,
            },
            type: sequelize.QueryTypes.SELECT,
          }
        ),

        // Status distribution (lighter raw SQL)
        sequelize.query(
          `
        SELECT assessment_status, COUNT(id) as count
        FROM tbl_assessment
        WHERE center_id = :centerId
          ${validQualificationIds.length > 0
            ? "AND qualification_id IN(:qualificationIds)"
            : ""
          }
        GROUP BY assessment_status
      `,
          {
            replacements: {
              centerId: userData.center_id,
              qualificationIds: validQualificationIds,
            },
            type: sequelize.QueryTypes.SELECT,
          }
        ),

        // Recent Activity (limit to only needed fields)
        Activity.findAll({
          where: { center_id: userData.center_id },
          include: {
            model: User,
            as: "user",
            attributes: ["id", "name", "surname", "email"],
          },
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),

        // Recent Resource (only essentials)
        ModuleRecords.findAll({
          where: { center_id: userData.center_id },
          include: {
            model: Image,
            as: "images_module_records",
            attributes: [
              "id",
              "image",
              "image_type",
              "image_name",
              "image_size",
            ],
          },
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),
      ]);

      // ------------------ Calculations ------------------
      const learnerChange =
        learnersThisMonth > 0
          ? (learnersThisMonth / (totalLearners > 0 ? totalLearners : 1)) * 100
          : 0;

      const assessorChange =
        assessorsThisWeek > 0
          ? (assessorsThisWeek / (activeAssessors > 0 ? activeAssessors : 1)) *
          100
          : 0;

      const assessmentChange =
        assessmentsThisMonth > 0
          ? (assessmentsThisMonth /
            (totalAssessments > 0 ? totalAssessments : 1)) *
          100
          : 0;

      // const successRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;

      const completedThisMonth = monthlyData
        .filter(
          (m: any) =>
            m.month ===
            `${currentDate.getFullYear()}-${String(
              currentDate.getMonth() + 1
            ).padStart(2, "0")}`
        )
        .reduce((sum: number, m: any) => sum + parseInt(m.completions), 0);

      // const successChangeThisMonth = assessmentsThisMonth > 0
      //   ? ((completedThisMonth / assessmentsThisMonth) * 100)
      //   : 0;

      // Prepare monthly overview
      const monthlyOverview: any[] = [];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthData = (monthlyData as any[]).find(
          (m) => m.month === monthKey
        ) as any;
        monthlyOverview.push({
          month: monthNames[date.getMonth()],
          submissions: monthData ? parseInt(monthData.submissions) : 0,
          completions: monthData ? parseInt(monthData.completions) : 0,
        });
      }

      const statusMap = {
        1: { label: "Created", color: "#3B82F6" },
        2: { label: "Evidence Submitted", color: "#3B82F6" },
        3: { label: "Under Review", color: "#F59E0B" },
        4: { label: "Completed", color: "#10B981" },
        5: { label: "With IQA", color: "#8B5CF6" },
        6: { label: "IQA Approved", color: "#10B981" },
      };

      const processedStatusDistribution = (statusDistribution as any[]).map(
        (item) => ({
          status: statusMap[item.assessment_status]?.label || "Unknown",
          count: parseInt(item.count),
          color: statusMap[item.assessment_status]?.color || "#6B7280",
        })
      );

      // ------------------ Final Response ------------------
      return {
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        data: {
          overview: {
            totalLearners: {
              value: totalLearners,
              change: Math.abs(parseFloat(learnerChange.toFixed(1))),
              note: `+${Math.abs(
                Number(learnerChange.toFixed(1))
              )}% new learners this month`,
            },
            activeAssessors: {
              value: activeAssessors,
              change: assessorsThisWeek,
              note: `${assessorsThisWeek} new this week`,
            },
            iqasSupervising: {
              value: iqasSupervising,
              change: 0,
              note: "All assigned",
            },
            qualifications: {
              value: qualifications,
              change: newQualifications,
              note: `${newQualifications} added recently`,
            },
            totalAssessments: {
              value: totalAssessments,
              change: Math.abs(parseFloat(assessmentChange.toFixed(1))),
              note: `+${Math.abs(
                Number(assessmentChange.toFixed(1))
              )}% new assessments this month`,
            },
            completed: {
              value: completedAssessments,
              rate: (
                (completedAssessments /
                  (totalAssessments > 0 ? totalAssessments : 1)) *
                100
              ).toFixed(1),
              note: `${(
                (completedAssessments /
                  (totalAssessments > 0 ? totalAssessments : 1)) *
                100
              ).toFixed(1)}% completion rate`,
            },
            pendingReview: {
              value: pendingReviewAssessments,
              note: "Needs attention",
            },
            // successRate: {
            //   value: parseFloat(successRate.toFixed(1)),
            //   change: Math.abs(parseFloat(successChangeThisMonth.toFixed(1))),
            //   note: `+${Math.abs(Number(successChangeThisMonth.toFixed(1)))}% this month's performance`
            // },
            qualificationSignedOff: {
              value: qualificationSignedOff,
              change: 0,
              note: "Qualifications completed",
            },
          },
          monthlyOverview,
          statusDistribution: processedStatusDistribution,
          activityFeed: recentActivity,
          modulesFromActivityRecords: recentResource,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Helper method to calculate time ago
  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  }

  // Helper method to get activity action text
  private static getActivityAction(status: number): string {
    const actionMap = {
      1: "created",
      2: "submitted evidence for",
      3: "rejected",
      4: "completed review of",
      5: "submitted for IQA review",
      6: "approved by IQA",
    };
    return actionMap[status] || "updated";
  }

  // Get Dashboard Assessor method
  static async getDashboardAssessor(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      if (userData.role !== Roles.ASSESSOR) {
        return {
          status: STATUS_CODES.SUCCESS,
          data: {
            overview: {
              totalQualifications: {
                value: 0,
                change: 0,
                note: "No qualifications",
              },
              numberOfLearners: {
                value: 0,
                change: 0,
                note: "No learners",
              },
              numberOfSubmissions: {
                value: 0,
                change: 0,
                note: "No submissions",
              },
              assessmentsIQA: {
                value: 0,
                change: 0,
                note: "No assessments IQA",
              },
              iqaActions: {
                value: 0,
                change: 0,
                note: "No IQA actions",
              },
              completedAssessments: {
                value: 0,
                change: 0,
                note: "No completed assessments",
              },
              pendingReviewAssessments: {
                value: 0,
                change: 0,
                note: "No pending review assessments",
              },
            },
            monthlyOverview: [],
            statusDistribution: [],
            activityFeed: [],
            modulesFromActivityRecords: [],
          },
          message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        };
      }
      const currentDate = new Date();
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const startOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
      );
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      const assessorId = userData.id;
      const centerId = userData.center_id;

      // ------------------ Batch 1: Get assigned learners and qualifications ------------------
      const [
        assignedLearners,
        newLearnersThisMonth,
        newLearnersLastMonth,
        totalQualifications,
        newQualificationsThisMonth,
      ] = await Promise.all([
        // Get learners assigned to this assessor
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT ua.user_id) as count 
          FROM tbl_user_assessor ua 
          INNER JOIN tbl_user u ON ua.user_id = u.id 
          WHERE ua.assessor_id = :assessorId 
            AND ua.status = 1 
            AND ua.deletedAt IS NULL 
            AND u.deletedAt IS NULL
        `,
            { replacements: { assessorId }, type: sequelize.QueryTypes.SELECT }
          )
          .then((r: any) => r[0]?.count || 0),

        // New learners assigned this month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT ua.user_id) as count 
          FROM tbl_user_assessor ua 
          INNER JOIN tbl_user u ON ua.user_id = u.id 
          WHERE ua.assessor_id = :assessorId 
            AND ua.status = 1 
            AND ua.deletedAt IS NULL 
            AND u.deletedAt IS NULL
            AND ua.createdAt >= :startOfMonth
        `,
            {
              replacements: { assessorId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),

        // New learners assigned last month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT ua.user_id) as count 
          FROM tbl_user_assessor ua 
          INNER JOIN tbl_user u ON ua.user_id = u.id 
          WHERE ua.assessor_id = :assessorId 
            AND ua.status = 1 
            AND ua.deletedAt IS NULL 
            AND u.deletedAt IS NULL
            AND ua.createdAt BETWEEN :startOfLastMonth AND :endOfLastMonth
        `,
            {
              replacements: { assessorId, startOfLastMonth, endOfLastMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),

        // Total qualifications for this assessor's learners
        sequelize
          .query(
            `
        SELECT COUNT(DISTINCT q.id) as count 
        FROM tbl_qualifications q 
        INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
        INNER JOIN tbl_user u ON uq.user_id = u.id 
        WHERE q.deletedAt IS NULL 
          AND q.status = 1 
          AND uq.deletedAt IS NULL 
          AND u.id = :assessorId 
          AND u.deletedAt IS NULL
          AND uq.createdAt >= :startOfMonth
        `,
            {
              replacements: { assessorId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),

        // New qualifications assigned this month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT q.id) as count 
          FROM tbl_qualifications q 
          INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
          INNER JOIN tbl_user_assessor ua ON uq.user_id = ua.user_id 
          WHERE q.deletedAt IS NULL 
            AND q.status = 1 
            AND uq.deletedAt IS NULL 
            AND ua.assessor_id = :assessorId 
            AND ua.status = 1 
            AND ua.deletedAt IS NULL
            AND uq.createdAt >= :startOfMonth
        `,
            {
              replacements: { assessorId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => r[0]?.count || 0),
      ]);

      // ------------------ Batch 2: Get assessment data ------------------
      const [
        totalSubmissions,
        submissionsThisMonth,
        submissionsLastMonth,
        assessmentsIQA,
        iqaActions,
        completedAssessments,
        pendingReviewAssessments,
      ] = await Promise.all([
        // Total submissions (learner agreed assessments)
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: { [Op.in]: [2, 3, 4, 5, 6] }, // learner agreed and beyond
          },
        }),

        // Submissions this month
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: { [Op.in]: [2, 3, 4, 5, 6] },
            createdAt: { [Op.gte]: startOfMonth },
          },
        }),

        // Submissions last month
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: { [Op.in]: [2, 3, 4, 5, 6] },
            createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] },
          },
        }),

        // Assessments IQA (marked assessments - status 4, 5, 6)
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: { [Op.in]: [4, 5, 6] },
          },
        }),

        // IQA actions (IQA approved - status 6)
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: 6,
          },
        }),

        // Completed assessments
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: 4,
          },
        }),

        // Pending review assessments
        Assessment.count({
          where: {
            assessor_id: assessorId,
            assessment_status: { [Op.in]: [2, 3, 5] },
          },
        }),
      ]);

      // ------------------ Batch 3: Get activity and module data ------------------
      const [
        monthlyData,
        statusDistribution,
        recentActivity,
        modulesFromActivity,
      ] = await Promise.all([
        // Monthly overview data
        sequelize.query(
          `
          SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
                 COUNT(id) as submissions,
                 SUM(CASE WHEN assessment_status = 4 THEN 1 ELSE 0 END) as completions,
                 SUM(CASE WHEN assessment_status = 6 THEN 1 ELSE 0 END) as iqa_approved
          FROM tbl_assessment
          WHERE assessor_id = :assessorId
            AND createdAt >= :sixMonthsAgo
          GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
          ORDER BY month ASC
        `,
          {
            replacements: { assessorId, sixMonthsAgo },
            type: sequelize.QueryTypes.SELECT,
          }
        ),

        // Status distribution
        sequelize.query(
          `
          SELECT assessment_status, COUNT(id) as count
          FROM tbl_assessment
          WHERE assessor_id = :assessorId
          GROUP BY assessment_status
        `,
          {
            replacements: { assessorId },
            type: sequelize.QueryTypes.SELECT,
          }
        ),

        // Recent activity for this assessor
        Activity.findAll({
          where: {
            center_id: centerId,
            user_id: assessorId,
          },
          include: {
            model: User,
            as: "user",
            attributes: ["id", "name", "surname", "email"],
          },
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),

        // Modules from activity records with proper filtering
        (async () => {
          const whereClause: any = {
            deletedAt: null,
            center_id: centerId,
          };

          // Get user's assigned qualifications and learners for filtering
          const userQualifications = await UserQualification.findAll({
            where: {
              user_id: assessorId,
              status: 1, // Active
              deletedAt: null,
            },
            attributes: ["qualification_id"],
          });

          const userLearners = await UserLearner.findAll({
            where: {
              user_id: assessorId,
              status: 1, // Active
            },
            attributes: ["learner_id"],
          });

          const qualificationIds = userQualifications.map(
            (uq) => uq.qualification_id
          );
          const learnerIds = userLearners.map((ul) => ul.learner_id);

          // Build complex where clause for module access
          const moduleAccessConditions = [];

          // Progress Review and Library modules are visible to everyone
          moduleAccessConditions.push({
            module_type: {
              [Op.in]: [ModuleTypes.PROGRESS_REVIEW, ModuleTypes.LIBRARY], // PROGRESS_REVIEW and LIBRARY
            },
          });

          // If user has qualifications, they can see qualification-type modules
          if (qualificationIds.length > 0) {
            moduleAccessConditions.push({
              [Op.and]: [
                { is_learner_or_qualification: 2 }, // Qualification type
                {
                  id: {
                    [Op.in]: sequelize.literal(`(
                      SELECT DISTINCT module_records_id 
                      FROM tbl_module_records_qualification 
                      WHERE qualification_id IN (${qualificationIds.join(",")})
                    )`),
                  },
                },
              ],
            });
          }

          // If user has learners, they can see learner-type modules
          if (learnerIds.length > 0) {
            moduleAccessConditions.push({
              [Op.and]: [
                { is_learner_or_qualification: 1 }, // Learner type
                {
                  id: {
                    [Op.in]: sequelize.literal(`(
                      SELECT DISTINCT module_records_id 
                      FROM tbl_module_records_learner 
                      WHERE learner_id IN (${learnerIds.join(",")})
                    )`),
                  },
                },
              ],
            });
          }

          // Always include Progress Review and Library modules, even if user has no qualifications or learners
          whereClause[Op.or] = moduleAccessConditions;

          // Default show created by user module records
          whereClause.created_by = assessorId;

          return ModuleRecords.findAll({
            where: whereClause,
            include: {
              model: Image,
              as: "images_module_records",
              attributes: [
                "id",
                "image",
                "image_type",
                "image_name",
                "image_size",
              ],
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
          });
        })(),
      ]);

      // ------------------ Calculations ------------------
      const learnerChange =
        assignedLearners > 0
          ? (newLearnersThisMonth / assignedLearners) * 100
          : 0;

      const submissionChange =
        totalSubmissions > 0
          ? (submissionsThisMonth / totalSubmissions) * 100
          : 0;

      // Prepare monthly overview
      const monthlyOverview: any[] = [];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthData = (monthlyData as any[]).find(
          (m) => m.month === monthKey
        ) as any;
        monthlyOverview.push({
          month: monthNames[date.getMonth()],
          submissions: monthData ? parseInt(monthData.submissions) : 0,
          completions: monthData ? parseInt(monthData.completions) : 0,
          iqaApproved: monthData ? parseInt(monthData.iqa_approved) : 0,
        });
      }

      // Status distribution mapping
      const statusMap = {
        1: { label: "Created", color: "#3B82F6" },
        2: { label: "Evidence Submitted", color: "#3B82F6" },
        3: { label: "Under Review", color: "#F59E0B" },
        4: { label: "Completed", color: "#10B981" },
        5: { label: "With IQA", color: "#8B5CF6" },
        6: { label: "IQA Approved", color: "#10B981" },
      };

      const processedStatusDistribution = (statusDistribution as any[]).map(
        (item) => ({
          status: statusMap[item.assessment_status]?.label || "Unknown",
          count: parseInt(item.count),
          color: statusMap[item.assessment_status]?.color || "#6B7280",
        })
      );

      // ------------------ Final Response ------------------
      return {
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        data: {
          overview: {
            totalQualifications: {
              value: totalQualifications,
              change: newQualificationsThisMonth,
              note: `${newQualificationsThisMonth} added recently`,
            },
            numberOfLearners: {
              value: assignedLearners,
              change: Math.abs(parseFloat(learnerChange.toFixed(1))),
              note: `+${Math.abs(
                Number(learnerChange.toFixed(1))
              )}% new learners this month`,
            },
            numberOfSubmissions: {
              value: totalSubmissions,
              change: Math.abs(parseFloat(submissionChange.toFixed(1))),
              note: `+${Math.abs(
                Number(submissionChange.toFixed(1))
              )}% submissions this month`,
            },
            assessmentsIQA: {
              value: assessmentsIQA,
              change: 0,
              note: "Assessments marked for IQA",
            },
            iqaActions: {
              value: iqaActions,
              change: 0,
              note: "IQA approved assessments",
            },
            completed: {
              value: completedAssessments,
              rate: (
                (completedAssessments /
                  (totalSubmissions > 0 ? totalSubmissions : 1)) *
                100
              ).toFixed(1),
              note: `${(
                (completedAssessments /
                  (totalSubmissions > 0 ? totalSubmissions : 1)) *
                100
              ).toFixed(1)}% completion rate`,
            },
            pendingReview: {
              value: pendingReviewAssessments,
              note: "Needs attention",
            },
          },
          monthlyOverview,
          statusDistribution: processedStatusDistribution,
          activityFeed: recentActivity,
          modulesFromActivityRecords: modulesFromActivity,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  static async getDashboardLearner(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      if (userData.role !== Roles.LEARNER || !data.qualification_id) {
        return {
          status: STATUS_CODES.SUCCESS,
          message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
          data: {
            overview: {
              numberOfQualifications: { value: 0, change: 0, note: "No qualifications" },
              progressOfQualifications: { value: 0, change: 0, note: "No progress" },
              numberOfAssessments: { value: 0, change: 0, note: "No assessments" },
              numberOfSubmissions: { value: 0, change: 0, note: "No submissions" },
              numberOfIQAActions: { value: 0, change: 0, note: "No IQA actions" },
              numberOfQualificationsSignedOff: { value: 0, change: 0, note: "No qualifications signed off" },
              numberOfCompletedUnits: { value: 0, change: 0, note: "No completed units" },
            },
            monthlyOverview: [],
            statusDistribution: [],
            activityFeed: [],
            activityRecordsModules: [],
          },
        };
      }

      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      const learnerId = userData.id;
      const centerId = userData.center_id;
      const qualificationId = data.qualification_id; // Extract qualification_id from request data

      // Get qualification data
      const qualificationWhereClause = { user_id: learnerId, deletedAt: null };
      if (qualificationId) {
        qualificationWhereClause['qualification_id'] = qualificationId;
      }

      const [totalQualifications, newQualificationsThisMonth, signedOffQualifications] = await Promise.all([
        UserQualification.count({
          where: qualificationWhereClause,
        }),
        UserQualification.count({
          where: { ...qualificationWhereClause, createdAt: { [Op.gte]: startOfMonth } },
        }),
        UserQualification.count({
          where: { ...qualificationWhereClause, is_signed_off: true },
        }),
      ]);

      // Calculate qualification progress
      const qualificationProgress = totalQualifications > 0 ? Math.round((signedOffQualifications / totalQualifications) * 100) : 0;

      // Get assessment data
      const assessmentWhereClause = { center_id: centerId, deletedAt: null };
      if (qualificationId) {
        assessmentWhereClause['qualification_id'] = qualificationId;
      }

      const [totalAssessments, totalSubmissions, iqaActions, completedUnits] = await Promise.all([
        Assessment.count({
          where: assessmentWhereClause,
          include: [{ model: User, as: "learners", where: { id: learnerId }, through: { attributes: [] } }],
        }),
        Assessment.count({
          where: { ...assessmentWhereClause, assessment_status: { [Op.in]: [2, 3, 4, 5, 6] } },
          include: [{ model: User, as: "learners", where: { id: learnerId }, through: { attributes: [] } }],
        }),
        Assessment.count({
          where: { ...assessmentWhereClause, assessment_status: 6 },
          include: [{ model: User, as: "learners", where: { id: learnerId }, through: { attributes: [] } }],
        }),
        Assessment.count({
          where: { ...assessmentWhereClause, assessment_status: 4 },
          include: [{ model: User, as: "learners", where: { id: learnerId }, through: { attributes: [] } }],
        }),
      ]);

      // Get activity data
      const recentActivity = await Activity.findAll({
        where: { center_id: centerId, user_id: learnerId },
        include: { model: User, as: "user", attributes: ["id", "name", "surname", "email"] },
        order: [["createdAt", "DESC"]],
        limit: 10,
      });

      // Get activity records modules
      const userQualificationsWhereClause = { user_id: learnerId, status: 1, deletedAt: null };
      if (qualificationId) {
        userQualificationsWhereClause['qualification_id'] = qualificationId;
      }

      const userQualifications = await UserQualification.findAll({
        where: userQualificationsWhereClause,
        attributes: ["qualification_id"],
      });

      const qualificationIds = userQualifications.map((uq) => uq.qualification_id);
      const moduleAccessConditions = [];

      // Progress Review and Library modules are visible to everyone
      moduleAccessConditions.push({
        module_type: { [Op.in]: [ModuleTypes.PROGRESS_REVIEW, ModuleTypes.LIBRARY] },
      });

      // Qualification-type modules
      if (qualificationIds.length > 0) {
        moduleAccessConditions.push({
          [Op.and]: [
            { is_learner_or_qualification: 2 },
            {
              id: {
                [Op.in]: sequelize.literal(`(
                  SELECT DISTINCT module_records_id 
                  FROM tbl_module_records_qualification 
                  WHERE qualification_id IN (${qualificationIds.join(",")})
                )`),
              },
            },
          ],
        });
      }

      // Learner-type modules
      moduleAccessConditions.push({
        [Op.and]: [
          { is_learner_or_qualification: 1 },
          {
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT DISTINCT module_records_id 
                FROM tbl_module_records_learner 
                WHERE learner_id = ${learnerId}
              )`),
            },
          },
        ],
      });

      moduleAccessConditions.push({
        [Op.and]: [
          {
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT DISTINCT module_records_id
                FROM tbl_module_records_learner
                WHERE learner_id = ${learnerId}
              )`)
            }
          }
        ]
      })

      const activityRecordsModules = await ModuleRecords.findAll({
        where: {
          deletedAt: null,
          center_id: centerId,
          [Op.or]: moduleAccessConditions,
          created_by: learnerId
        },
        include: {
          model: Image,
          as: "images_module_records",
          attributes: ["id", "image", "image_type", "image_name", "image_size"],
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
      });

      // Get monthly data
      let monthlyQuery = `
        SELECT DATE_FORMAT(a.createdAt, '%Y-%m') as month,
               COUNT(a.id) as submissions,
               SUM(CASE WHEN a.assessment_status = 4 THEN 1 ELSE 0 END) as completions,
               SUM(CASE WHEN a.assessment_status = 6 THEN 1 ELSE 0 END) as iqa_approved
        FROM tbl_assessment a
        INNER JOIN tbl_assessment_learner al ON a.id = al.assessment_id
        WHERE a.center_id = :centerId
          AND al.learner_id = :learnerId
          AND a.createdAt >= :sixMonthsAgo
          AND a.deletedAt IS NULL
      `;

      const replacements = { centerId, learnerId, sixMonthsAgo };
      if (qualificationId) {
        monthlyQuery += ` AND a.qualification_id = :qualificationId`;
        replacements['qualificationId'] = qualificationId;
      }

      monthlyQuery += `
        GROUP BY DATE_FORMAT(a.createdAt, '%Y-%m')
        ORDER BY month ASC
      `;

      const monthlyData = await sequelize.query(monthlyQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Get status distribution
      let statusQuery = `
        SELECT a.assessment_status, COUNT(a.id) as count
        FROM tbl_assessment a
        INNER JOIN tbl_assessment_learner al ON a.id = al.assessment_id
        WHERE a.center_id = :centerId
          AND al.learner_id = :learnerId
          AND a.deletedAt IS NULL
      `;

      const statusReplacements = { centerId, learnerId };
      if (qualificationId) {
        statusQuery += ` AND a.qualification_id = :qualificationId`;
        statusReplacements['qualificationId'] = qualificationId;
      }

      statusQuery += ` GROUP BY a.assessment_status`;

      const statusDistribution = await sequelize.query(statusQuery, {
        replacements: statusReplacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Prepare monthly overview
      const monthlyOverview: any[] = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthData = (monthlyData as any[]).find((m) => m.month === monthKey) as any;
        monthlyOverview.push({
          month: monthNames[date.getMonth()],
          submissions: monthData ? parseInt(monthData.submissions) : 0,
          completions: monthData ? parseInt(monthData.completions) : 0,
          iqaApproved: monthData ? parseInt(monthData.iqa_approved) : 0,
        });
      }

      // Status distribution mapping
      const statusMap = {
        1: { label: "Created", color: "#3B82F6" },
        2: { label: "Evidence Submitted", color: "#3B82F6" },
        3: { label: "Under Review", color: "#F59E0B" },
        4: { label: "Completed", color: "#10B981" },
        5: { label: "With IQA", color: "#8B5CF6" },
        6: { label: "IQA Approved", color: "#10B981" },
      };

      const processedStatusDistribution = (statusDistribution as any[]).map((item) => ({
        status: statusMap[item.assessment_status]?.label || "Unknown",
        count: parseInt(item.count),
        color: statusMap[item.assessment_status]?.color || "#6B7280",
      }));

      // ==== NEW PART: QUALIFICATION + UNITS + PROGRESS ====
      let qualificationProgressQuery = `
      SELECT 
          uq.qualification_id,
          q.name AS qualification_name,
          u.id AS unit_id,
          u.unit_title,
          COUNT(DISTINCT os.id) AS total_subpoints,
          SUM(CASE WHEN am.marks IS NOT NULL AND am.marks >= 1 THEN 1 ELSE 0 END) AS achieved_subpoints,
          ROUND(
              (SUM(CASE WHEN am.marks IS NOT NULL AND am.marks >= 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT os.id)) * 100, 
              2
          ) AS progress_percent
      FROM tbl_user_qualification uq
      INNER JOIN tbl_qualifications q ON q.id = uq.qualification_id
      INNER JOIN tbl_units u ON u.qualification_id = q.id
      INNER JOIN tbl_sub_outcomes so ON so.unit_id = u.id
      INNER JOIN tbl_outcome_subpoints os ON os.outcome_id = so.id
      LEFT JOIN (
          SELECT am1.*
          FROM tbl_assessment_marks am1
          INNER JOIN (
              SELECT learner_id, qualification_id, unit_id, subpoint_id, MAX(marks) AS max_marks
              FROM tbl_assessment_marks
              GROUP BY learner_id, qualification_id, unit_id, subpoint_id
          ) grouped 
            ON am1.learner_id = grouped.learner_id
           AND am1.qualification_id = grouped.qualification_id
           AND am1.unit_id = grouped.unit_id
           AND am1.subpoint_id = grouped.subpoint_id
           AND am1.marks = grouped.max_marks
      ) am ON am.unit_id = u.id AND am.subpoint_id = os.id 
         AND am.learner_id = uq.user_id
         AND am.qualification_id = uq.qualification_id
      WHERE uq.user_id = :learnerId
        AND uq.is_signed_off = FALSE
      `;

      const qualificationProgressReplacements = { learnerId };
      if (qualificationId) {
        qualificationProgressQuery += ` AND uq.qualification_id = :qualificationId`;
        qualificationProgressReplacements['qualificationId'] = qualificationId;
      }

      qualificationProgressQuery += `
      GROUP BY uq.qualification_id, q.name, u.id
      ORDER BY q.id, u.unit_number
      `;

      const qualificationUnitProgress = await sequelize.query(qualificationProgressQuery, {
        replacements: qualificationProgressReplacements,
        type: sequelize.QueryTypes.SELECT,
      });

      // Group into nested JSON
      const nestedQualifications: any = {};
      qualificationUnitProgress.forEach((row: any) => {
        if (!nestedQualifications.qualification_id) {
          nestedQualifications.qualification_id = row.qualification_id;
          nestedQualifications.qualification_name = row.qualification_name;
          nestedQualifications.units = [];
        }
        nestedQualifications.units.push({
          unit_id: row.unit_id,
          unit_title: row.unit_title,
          progress_percent: row.progress_percent || 0,
        });
      });

      return {
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        data: {
          overview: {
            numberOfQualifications: {
              value: totalQualifications,
              change: newQualificationsThisMonth,
              note: `${newQualificationsThisMonth} added recently`,
            },
            progressOfQualifications: {
              value: qualificationProgress,
              change: 0,
              note: `${qualificationProgress}% completion rate`,
            },
            numberOfAssessments: {
              value: totalAssessments,
              change: 0,
              note: "Total assessments assigned",
            },
            numberOfSubmissions: {
              value: totalSubmissions,
              change: 0,
              note: "Total submissions made",
            },
            numberOfIQAActions: {
              value: iqaActions,
              change: 0,
              note: "IQA approved assessments",
            },
            numberOfQualificationsSignedOff: {
              value: signedOffQualifications,
              change: 0,
              note: "Qualifications completed",
            },
            numberOfCompletedUnits: {
              value: completedUnits,
              change: 0,
              note: "Units completed for graph data",
            },
          },
          monthlyOverview,
          statusDistribution: processedStatusDistribution,
          activityFeed: recentActivity,
          activityRecordsModules,
          qualificationProgressData: nestedQualifications
        },
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  static async getDashboardIQA(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      if (userData.role !== Roles.IQA) {
        return {
          status: STATUS_CODES.SUCCESS,
          message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
          data: {
            overview: {
              numberOfQualifications: { value: 0, change: 0, note: "No qualifications" },
              numberOfSampling: { value: 0, change: 0, note: "No sampling" },
              numberOfLearner: { value: 0, change: 0, note: "No learners" },
              numberOfSignedOff: { value: 0, change: 0, note: "No signed off qualifications" }
            },
            monthlyOverviewAssessmentApproveReject: [],
            activityFeed: [],
            activityRecordsModules: [],
          }
        };
      }

      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      const iqaId = userData.id;
      const centerId = userData.center_id;

      // ------------------ Batch 1: Get IQA-specific counts ------------------
      const [
        totalQualifications,
        newQualificationsThisMonth,
        totalSampling,
        newSamplingThisMonth,
        totalLearners,
        newLearnersThisMonth,
        totalSignedOff,
        newSignedOffThisMonth,
      ] = await Promise.all([
        // Total qualifications supervised by this IQA
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT q.id) as count 
          FROM tbl_qualifications q 
          INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
          INNER JOIN tbl_user u ON uq.user_id = u.id 
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE q.deletedAt IS NULL 
            AND q.status = 1 
            AND uq.deletedAt IS NULL 
            AND u.center_id = :centerId 
            AND u.deletedAt IS NULL
            AND ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
        `,
            {
              replacements: { centerId, iqaId },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // New qualifications this month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT q.id) as count 
          FROM tbl_qualifications q 
          INNER JOIN tbl_user_qualification uq ON q.id = uq.qualification_id 
          INNER JOIN tbl_user u ON uq.user_id = u.id 
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE q.deletedAt IS NULL 
            AND q.status = 1 
            AND uq.deletedAt IS NULL 
            AND u.center_id = :centerId 
            AND u.deletedAt IS NULL
            AND ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
            AND uq.createdAt >= :startOfMonth
        `,
            {
              replacements: { centerId, iqaId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // Total sampling records
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT s.id) as count 
          FROM tbl_sampling s 
          INNER JOIN tbl_user u ON s.learner_id = u.id
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
            AND s.deletedAt IS NULL
            AND u.center_id = :centerId
            AND u.deletedAt IS NULL
        `,
            {
              replacements: { centerId, iqaId },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // New sampling this month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT s.id) as count 
          FROM tbl_sampling s 
          INNER JOIN tbl_user u ON s.learner_id = u.id
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
            AND s.deletedAt IS NULL
            AND u.center_id = :centerId
            AND u.deletedAt IS NULL
            AND s.createdAt >= :startOfMonth
        `,
            {
              replacements: { centerId, iqaId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // Total learners supervised by IQA
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT ui.user_id) as count 
          FROM tbl_user_iqa ui 
          INNER JOIN tbl_user u ON ui.user_id = u.id 
          WHERE ui.iqa_id = :iqaId 
            AND ui.status = 1 
            AND ui.deletedAt IS NULL 
            AND u.deletedAt IS NULL
            AND u.center_id = :centerId
        `,
            {
              replacements: { centerId, iqaId },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // New learners this month
        sequelize
          .query(
            `
          SELECT COUNT(DISTINCT ui.user_id) as count 
          FROM tbl_user_iqa ui 
          INNER JOIN tbl_user u ON ui.user_id = u.id 
          WHERE ui.iqa_id = :iqaId 
            AND ui.status = 1 
            AND ui.deletedAt IS NULL 
            AND u.deletedAt IS NULL
            AND u.center_id = :centerId
            AND ui.createdAt >= :startOfMonth
        `,
            {
              replacements: { centerId, iqaId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // Total signed off qualifications
        sequelize
          .query(
            `
          SELECT COUNT(*) as count 
          FROM tbl_user_qualification uq 
          INNER JOIN tbl_user u ON uq.user_id = u.id 
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE uq.is_signed_off = true 
            AND uq.deletedAt IS NULL 
            AND u.center_id = :centerId 
            AND u.deletedAt IS NULL
            AND ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
        `,
            {
              replacements: { centerId, iqaId },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),

        // New signed off this month
        sequelize
          .query(
            `
          SELECT COUNT(*) as count 
          FROM tbl_user_qualification uq 
          INNER JOIN tbl_user u ON uq.user_id = u.id 
          INNER JOIN tbl_user_iqa ui ON u.id = ui.user_id
          WHERE uq.is_signed_off = true 
            AND uq.deletedAt IS NULL 
            AND u.center_id = :centerId 
            AND u.deletedAt IS NULL
            AND ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
            AND uq.updatedAt >= :startOfMonth
        `,
            {
              replacements: { centerId, iqaId, startOfMonth },
              type: sequelize.QueryTypes.SELECT,
            }
          )
          .then((r: any) => Number(r[0]?.count) || 0),
      ]);

      // ------------------ Batch 2: Get monthly data and activity ------------------
      const [
        monthlyApproveRejectData,
        recentActivity,
        activityRecordsModules,
      ] = await Promise.all([
        // Monthly assessment approve/reject data
        sequelize.query(
          `
          SELECT 
            DATE_FORMAT(a.updatedAt, '%Y-%m') as month,
            SUM(CASE WHEN a.assessment_status = 6 THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN a.assessment_status = 3 THEN 1 ELSE 0 END) as rejected,
            COUNT(a.id) as total_reviewed
          FROM tbl_assessment a
          INNER JOIN tbl_assessment_learner al ON a.id = al.assessment_id
          INNER JOIN tbl_user_iqa ui ON al.learner_id = ui.user_id
          WHERE a.center_id = :centerId
            AND ui.iqa_id = :iqaId
            AND ui.status = 1
            AND ui.deletedAt IS NULL
            AND a.deletedAt IS NULL
            AND a.assessment_status IN (3, 6)
            AND a.updatedAt >= :sixMonthsAgo
          GROUP BY DATE_FORMAT(a.updatedAt, '%Y-%m')
          ORDER BY month ASC
        `,
          {
            replacements: { centerId, iqaId, sixMonthsAgo },
            type: sequelize.QueryTypes.SELECT,
          }
        ),

        // Recent activity for IQA and supervised learners
        (async () => {
          // Get all learners supervised by this IQA
          const supervisedLearners = await UserIQA.findAll({
            where: {
              iqa_id: iqaId,
              status: 1,
              deletedAt: null,
            } as any,
            attributes: ["user_id"],
          });

          const learnerIds = supervisedLearners.map((ui) => ui.user_id);
          
          // Include both IQA's activities and supervised learners' activities
          const userIdsForActivity = [iqaId, ...learnerIds];

          return Activity.findAll({
            where: {
              center_id: centerId,
              user_id: { [Op.in]: userIdsForActivity },
            },
            include: {
              model: User,
              as: "user",
              attributes: ["id", "name", "surname", "email"],
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
          });
        })(),

        // Activity records modules
        (async () => {
          // Get all learners supervised by this IQA
          const supervisedLearners = await UserIQA.findAll({
            where: {
              iqa_id: iqaId,
              status: 1,
              deletedAt: null,
            } as any,
            attributes: ["user_id"],
          });

          const learnerIds = supervisedLearners.map((ui) => ui.user_id);

          // Return empty array if no learners are supervised
          if (learnerIds.length === 0) {
            return [];
          }

          // Get qualifications of all supervised learners
          const userQualifications = await UserQualification.findAll({
            where: {
              user_id: { [Op.in]: learnerIds },
              status: 1,
              deletedAt: null,
            },
            attributes: ["qualification_id"],
          });

          const qualificationIds = [
            ...new Set(userQualifications.map((uq) => uq.qualification_id)),
          ];

          const moduleAccessConditions = [];

          // Progress Review and Library modules
          moduleAccessConditions.push({
            module_type: {
              [Op.in]: [ModuleTypes.PROGRESS_REVIEW, ModuleTypes.LIBRARY],
            },
          });

          // Qualification-type modules - Fixed SQL injection
          if (qualificationIds.length > 0) {
            const moduleRecordsQualifications = await sequelize.query(
              `
              SELECT DISTINCT module_records_id 
              FROM tbl_module_records_qualification 
              WHERE qualification_id IN (:qualificationIds)
                AND deletedAt IS NULL
            `,
              {
                replacements: { qualificationIds },
                type: sequelize.QueryTypes.SELECT,
              }
            );

            const moduleRecordsIds = moduleRecordsQualifications.map(
              (mrq: any) => mrq.module_records_id
            );

            if (moduleRecordsIds.length > 0) {
              moduleAccessConditions.push({
                [Op.and]: [
                  { is_learner_or_qualification: 2 },
                  { id: { [Op.in]: moduleRecordsIds } },
                ],
              });
            }
          }

          return ModuleRecords.findAll({
            where: {
              deletedAt: null,
              center_id: centerId,
              [Op.or]: moduleAccessConditions,
            },
            include: {
              model: Image,
              as: "images_module_records",
              attributes: [
                "id",
                "image",
                "image_type",
                "image_name",
                "image_size",
              ],
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
          });
        })(),
      ]);

      // ------------------ Calculations ------------------
      // Change values now represent actual counts instead of percentages
      const qualificationChange = newQualificationsThisMonth;
      const samplingChange = newSamplingThisMonth;
      const learnerChange = newLearnersThisMonth;
      const signedOffChange = newSignedOffThisMonth;

      // Prepare monthly overview for chart
      const monthlyOverview: any[] = [];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Generate last 6 months of data
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthData = (monthlyApproveRejectData as any[]).find(
          (m) => m.month === monthKey
        ) as any;
        
        monthlyOverview.push({
          month: monthNames[date.getMonth()],
          approved: monthData ? Number(monthData.approved) : 0,
          rejected: monthData ? Number(monthData.rejected) : 0,
          totalReviewed: monthData ? Number(monthData.total_reviewed) : 0,
        });
      }

      // ------------------ Final Response ------------------
      return {
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        data: {
          overview: {
            numberOfQualifications: {
              value: totalQualifications,
              change: qualificationChange,
              note: `${newQualificationsThisMonth} added recently`,
            },
            numberOfSampling: {
              value: totalSampling,
              change: samplingChange,
              note: `${newSamplingThisMonth} new sampling this month`,
            },
            numberOfLearner: {
              value: totalLearners,
              change: learnerChange,
              note: `${newLearnersThisMonth} new learners this month`,
            },
            numberOfSignedOff: {
              value: totalSignedOff,
              change: signedOffChange,
              note: `${newSignedOffThisMonth} signed off this month`,
            },
          },
          monthlyOverviewAssessmentApproveReject: monthlyOverview,
          activityFeed: recentActivity,
          activityRecordsModules,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Contact Us
  static async contactUs(data): Promise<any> {
    try {
      let isValidEmail_ = await isValidEmail(data.email) 
      if (!isValidEmail_) {
        return {
          status: STATUS_CODES.CONFLICT,
          message: "Invalid Email Address"
        }
      }
      // Send Email to Customer
      await emailService.sendContactUsCustomerEmail(
        data.email,
        data.name
      )
      // Send Email to Admin
      await emailService.sendContactUsAdminEmail(
        data.name,
        data.email,
        data.message
      )
      return {
        status: STATUS_CODES.SUCCESS,
        message: "Success"
      }
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Clean Database
  static async cleanDatabase(): Promise<any> {
    try {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");
      for (const tableName of Object.values(TABLE_NAME)) {
        if (tableName === TABLE_NAME.USER) {
          // name of Janice, Urmil and Amit should not be deleted
          await sequelize.query(`
            DELETE FROM ${tableName}
            WHERE name NOT IN ('Janice', 'Urmil', 'Amit');
          `);
          continue;
        }
        const skipTables = [TABLE_NAME.ROLE, TABLE_NAME.METHODS];
        if (skipTables.includes(tableName)) continue;
        await sequelize.query(`TRUNCATE TABLE ${tableName};`);
      }
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");
      return {
        status: STATUS_CODES.SUCCESS,
        message: "Success",
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

export default MasterService;
