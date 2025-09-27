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
    await queryInterface.addColumn("tbl_user", "additional_learning_text", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "default_center_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional field for default center
      comment: "Filed for default center, For Super Admin",
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_user", "additional_learning_text");
    await queryInterface.removeColumn("tbl_user", "default_center_id");
  }
};
