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
    await queryInterface.addColumn("tbl_sampling", "created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
    })
    await queryInterface.addColumn("tbl_sampling", "center_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_sampling", "created_by")
    await queryInterface.removeColumn("tbl_sampling", "center_id")
  }
};
