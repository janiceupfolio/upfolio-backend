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
    await queryInterface.addColumn("tbl_assessment", "assessment_status", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment:
        "1: create | 2: learner agreed | 3: assessor reject | 4: completed | 5: not agreed by IQA | 6: agreed by IQA",
      defaultValue: 1
    });
    await queryInterface.addColumn("tbl_assessment", "feedback", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_assessment", "assessment_status");
    await queryInterface.removeColumn("tbl_assessment", "feedback");
  }
};
