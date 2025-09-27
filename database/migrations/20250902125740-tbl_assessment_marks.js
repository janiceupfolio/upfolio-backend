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
    await queryInterface.createTable("tbl_assessment_marks", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      learner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      assessor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      qualification_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      main_outcome_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sub_outcome_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      subpoint_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      marks: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "0",
      },
      max_marks: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "2",
      },
      attempt: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "1",
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
    await queryInterface.dropTable("tbl_assessment_marks");
  }
};
