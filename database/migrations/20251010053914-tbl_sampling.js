'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable("tbl_sampling", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      learner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      date: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      assessor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sampling_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "1: Formative | 2: Interim | 3: Summative",
      },
      qualification_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      iqa_notes: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_assessment_assessed: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_learner_work: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_assessed_by_other_assessor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_learner_competance: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_assessment_sufficient: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_accept_sampling: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      action_date: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      further_action_note: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reference_type: {
        type: Sequelize.INTEGER,
        comment: "1: Unit | 2: Assessment",
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("tbl_sampling");
  }
};
