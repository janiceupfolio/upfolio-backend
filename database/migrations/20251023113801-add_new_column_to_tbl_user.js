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
    await queryInterface.addColumn("tbl_user", "uln_number", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Learner ULN Number"
    });
    await queryInterface.addColumn("tbl_user", "name_of_awarding_body", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Learner Name of Awarding Body"
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_user", "uln_number");
    await queryInterface.removeColumn("tbl_user", "name_of_awarding_body");
  }
};
