"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      "tbl_role",
      { role_slug: "super-admin" },
      { role: "Super Admin" }
    );
    await queryInterface.bulkUpdate(
      "tbl_role",
      { role_slug: "assessor" },
      { role: "Assessor" }
    );
    await queryInterface.bulkUpdate(
      "tbl_role",
      { role_slug: "learner" },
      { role: "Learner" }
    );
    await queryInterface.bulkUpdate(
      "tbl_role",
      { role_slug: "observer" },
      { role: "Observer" }
    );
    await queryInterface.bulkInsert("tbl_role", [
      {
        role: "IQA",
        role_slug: "iqa",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        role: "EQA",
        role_slug: "eqa",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        role: "Admin",
        role_slug: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);
  },

  async down(queryInterface, Sequelize) {},
};
