"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("tbl_user", "additional_iqa_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional field for additional IQA ID
      comment: "Optional field for additional IQA ID",
    });
    await queryInterface.addColumn("tbl_user", "additional_assessor_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional field for additional Assessor ID
      comment: "Optional field for additional Assessor ID",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_user", "additional_iqa_id");
    await queryInterface.removeColumn("tbl_user", "additional_assessor_id");
  },
};
