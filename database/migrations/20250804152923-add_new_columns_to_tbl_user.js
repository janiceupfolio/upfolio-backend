"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tbl_user", "about", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "trainee", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tbl_user", "about");
    await queryInterface.removeColumn("tbl_user", "trainee");
  },
};
