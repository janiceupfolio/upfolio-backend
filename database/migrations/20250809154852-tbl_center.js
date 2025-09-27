'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("tbl_center", {
      id: {
        type: Sequelize.BIGINT, // Using BIGINT for large range
        autoIncrement: true,
        primaryKey: true,
      },
      center_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      center_admin: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        comment: "1: Active, 2: Inactive",
        defaultValue: 1, // Active: 1, Inactive: 2
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
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("tbl_center");
  }
};
