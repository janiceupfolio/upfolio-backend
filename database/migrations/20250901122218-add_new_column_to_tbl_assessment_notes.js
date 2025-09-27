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
    await queryInterface.addColumn('tbl_assessment_notes', 'workflow_phase', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "We manage this paramter for show or hide feedback in learner of iqa"
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('tbl_assessment_notes', 'workflow_phase')
  }
};
