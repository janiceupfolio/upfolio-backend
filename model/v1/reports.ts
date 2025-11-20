require("dotenv").config();
import { userAuthenticationData } from "../../interface/user";
import {
  Entity,
  EntityType,
  ModuleTypes,
  Roles,
  STATUS_CODES,
  STATUS_MESSAGE,
} from "../../configs/constants";
import { Op } from "sequelize";
import {
  centerId,
} from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import UserAssessor from "../../database/schema/user_assessor";
import Units from "../../database/schema/units";
import UserUnits from "../../database/schema/user_units";
const { sequelize } = require("../../configs/database");

class ReportsService {
  static async getIqaSamplingMatrixReport(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      // --- fetch assessors -> learner ids
      const userAssessors = await UserAssessor.findAll({
        where: { assessor_id: data.assessor_id },
        attributes: ["user_id"],
      });
      const learnerIds = userAssessors.map((ua) => ua.user_id);

      // --- fetch learner qualifications (includes sign off flags)
      const learnerQualifications = await UserQualification.findAll({
        where: {
          user_id: { [Op.in]: learnerIds },
          qualification_id: data.qualification_id,
        },
        attributes: [
          "user_id",
          "qualification_id",
          "is_signed_off",
          "is_optional_assigned",
        ],
      });

      const finalLearnerIds = learnerQualifications.map((lq) => lq.user_id);
      const qualificationIds = learnerQualifications.map(
        (lq) => lq.qualification_id
      );

      let learnerWhere: any = {
        id: { [Op.in]: finalLearnerIds },
        role: Roles.LEARNER,
        deletedAt: null,
      };

      if (data.learner_name_search) {
        learnerWhere[Op.or] = [
          { name: { [Op.like]: `%${data.learner_name_search}%` } },
          { surname: { [Op.like]: `%${data.learner_name_search}%` } },
        ];
      }

      // --- fetch learners
      const learners = await User.findAll({
        where: learnerWhere,
        attributes: ["id", "name", "surname"],
      });

      // --- fetch qualifications
      const qualifications = await Qualifications.findAll({
        where: { id: { [Op.in]: qualificationIds } },
        attributes: ["id", "name", "qualification_no"],
      });

      // --- fetch units for those qualifications
      // NOTE: I've included qualification_id here so we can group units by qualification.
      const units = await Units.findAll({
        where: { qualification_id: { [Op.in]: qualificationIds } },
        attributes: [
          "id",
          "unit_title",
          "unit_number",
          "unit_ref_no",
          "qualification_id",
        ],
      });

      const unitIds = units.map((u) => u.id);

      // --- fetch userUnits (sampling data) and include IQA user
      const userUnits = await UserUnits.findAll({
        where: {
          user_id: { [Op.in]: finalLearnerIds },
          unit_id: { [Op.in]: unitIds },
        },
        include: [
          {
            model: User,
            as: "iqa",
            attributes: ["id", "name", "surname"],
          },
        ],
        attributes: [
          "user_id",
          "unit_id",
          "is_sampling",
          "is_assigned",
          "iqa_id",
          "sampled_at",
        ],
      });

      // Helper: find userUnit quickly
      const userUnitKeyMap = new Map<string, any>();
      userUnits.forEach((uu) => {
        // build composite key "userId|unitId"
        const key = `${uu.user_id}|${uu.unit_id}`;
        userUnitKeyMap.set(key, uu);
      });

      // Helper: map qualifications by id
      const qualMap = new Map<number, any>();
      qualifications.forEach((q) => qualMap.set(q.id, q));

      // Helper: group units by qualification_id
      const unitsByQualification = new Map<number, any[]>();
      units.forEach((u) => {
        const qid = u.qualification_id;
        if (!unitsByQualification.has(qid)) unitsByQualification.set(qid, []);
        unitsByQualification.get(qid).push(u);
      });

      // Build response array
      const response = learners.map((learner) => {
        // get learner's UserQualification entry (we assume single qualification per learner)
        const lq = learnerQualifications.find((x) => x.user_id === learner.id);

        const qualificationObj = lq ? qualMap.get(lq.qualification_id) : null;

        // Build units list for this qualification (if none, still return empty units array)
        const qUnits = qualificationObj
          ? unitsByQualification.get(qualificationObj.id) || []
          : [];

        const unitsArr = qUnits.map((unit) => {
          const key = `${learner.id}|${unit.id}`;
          const uu = userUnitKeyMap.get(key);

          return {
            id: unit.id,
            unitNumber: unit.unit_number, // per your fields
            unitTitle: unit.unit_title, // per your fields
            is_sampled: uu ? !!uu.is_sampling : false,
            is_assigned: uu ? !!uu.is_assigned : false,
            iqa:
              uu && uu.iqa
                ? {
                    id: uu.iqa.id,
                    name: uu.iqa.name,
                    surname: uu.iqa.surname,
                  }
                : null,
            sampled_date: uu ? uu.sampled_at : null,
          };
        });

        return {
          learner_id: learner.id,
          learner_name: `${learner.name} ${learner.surname}`,
          is_signed_off: lq ? !!lq.is_signed_off : false,
          is_optional_assigned: lq ? !!lq.is_optional_assigned : false,
          qualifications: qualificationObj
            ? [
                {
                  qualification_id: qualificationObj.id,
                  qualification_name: qualificationObj.name,
                  units: unitsArr,
                },
              ]
            : [],
        };
      });

      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "IQA Sampling Matrix Report retrieved successfully",
      };
    } catch (error) {
      return {
        status: STATUS_CODES.SERVER_ERROR,
        data: null,
        message: error.message,
      };
    }
  }
}

export default ReportsService;
