"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // tbl_assessment_marks: accelerate WHEREs and GROUP BYs used in statistics
    await queryInterface.addIndex("tbl_assessment_marks", ["learner_id"], {
      name: "idx_assessment_marks_learner_id",
    });
    await queryInterface.addIndex("tbl_assessment_marks", ["unit_id"], {
      name: "idx_assessment_marks_unit_id",
    });
    await queryInterface.addIndex(
      "tbl_assessment_marks",
      ["learner_id", "unit_id"],
      { name: "idx_assessment_marks_learner_unit" }
    );
    await queryInterface.addIndex(
      "tbl_assessment_marks",
      ["learner_id", "qualification_id", "unit_id", "sub_outcome_id", "subpoint_id", "createdAt"],
      { name: "idx_assessment_marks_latest_lookup" }
    );
    await queryInterface.addIndex("tbl_assessment_marks", ["deletedAt"], {
      name: "idx_assessment_marks_deletedAt",
    });

    // tbl_sub_outcomes: used to sum possible marks per unit
    await queryInterface.addIndex("tbl_sub_outcomes", ["unit_id"], {
      name: "idx_sub_outcomes_unit_id",
    });
    await queryInterface.addIndex("tbl_sub_outcomes", ["deletedAt"], {
      name: "idx_sub_outcomes_deletedAt",
    });

    // tbl_outcome_subpoints: used to sum possible marks per outcome
    await queryInterface.addIndex("tbl_outcome_subpoints", ["outcome_id"], {
      name: "idx_outcome_subpoints_outcome_id",
    });
    await queryInterface.addIndex("tbl_outcome_subpoints", ["deletedAt"], {
      name: "idx_outcome_subpoints_deletedAt",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("tbl_assessment_marks", "idx_assessment_marks_learner_id");
    await queryInterface.removeIndex("tbl_assessment_marks", "idx_assessment_marks_unit_id");
    await queryInterface.removeIndex("tbl_assessment_marks", "idx_assessment_marks_learner_unit");
    await queryInterface.removeIndex("tbl_assessment_marks", "idx_assessment_marks_latest_lookup");
    await queryInterface.removeIndex("tbl_assessment_marks", "idx_assessment_marks_deletedAt");

    await queryInterface.removeIndex("tbl_sub_outcomes", "idx_sub_outcomes_unit_id");
    await queryInterface.removeIndex("tbl_sub_outcomes", "idx_sub_outcomes_deletedAt");

    await queryInterface.removeIndex("tbl_outcome_subpoints", "idx_outcome_subpoints_outcome_id");
    await queryInterface.removeIndex("tbl_outcome_subpoints", "idx_outcome_subpoints_deletedAt");
  },
};


