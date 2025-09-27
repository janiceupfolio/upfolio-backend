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
    await queryInterface.addColumn('tbl_units', 'marks', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Marks for the unit",
      defaultValue: "2",
    })
    
    await queryInterface.addColumn('tbl_sub_outcomes', 'marks', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Marks for the sub outcome",
      defaultValue: "2",
    })

    await queryInterface.addColumn('tbl_main_outcomes', 'marks', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Marks for the main outcome",
      defaultValue: "2",
    })

    await queryInterface.addColumn('tbl_outcome_subpoints', 'marks', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Marks for the outcome subpoint",
      defaultValue: "2",
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('tbl_units', 'marks')
    await queryInterface.removeColumn('tbl_sub_outcomes', 'marks')
    await queryInterface.removeColumn('tbl_main_outcomes', 'marks')
    await queryInterface.removeColumn('tbl_outcome_subpoints', 'marks')
  }
};
