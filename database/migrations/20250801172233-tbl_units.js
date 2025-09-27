"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tbl_units", {
      id: {
        type: Sequelize.BIGINT, // Using BIGINT for large range
        autoIncrement: true,
        primaryKey: true,
      },
      qualification_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unit_title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      unit_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      unit_ref_no: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      created_by: {
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("tbl_units");
  },
};
