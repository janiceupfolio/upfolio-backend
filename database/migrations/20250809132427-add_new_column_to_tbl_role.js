'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("tbl_role", "role_slug", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "center_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional field for center association)
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_role", "role_slug");
    await queryInterface.removeColumn("tbl_user", "center_id");
  }
};
