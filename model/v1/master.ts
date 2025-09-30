require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import {
  Roles,
  STATUS_CODES,
  STATUS_MESSAGE,
  ModuleTypes,
} from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { generateSecurePassword, paginate } from "../../helper/utils";
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
            recentActivity: [],
            recentResource: [],
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
          ${
            validQualificationIds.length > 0
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
          ${
            validQualificationIds.length > 0
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
          recentActivity,
          recentResource,
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
          INNER JOIN tbl_user_assessor ua ON uq.user_id = ua.user_id 
          WHERE q.deletedAt IS NULL 
            AND q.status = 1 
            AND uq.deletedAt IS NULL 
            AND ua.assessor_id = :assessorId 
            AND ua.status = 1 
            AND ua.deletedAt IS NULL
        `,
            { replacements: { assessorId }, type: sequelize.QueryTypes.SELECT }
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
}

export default MasterService;
