'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "tbl_role",
      [
        {
          role: "Super Admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          role: "Assessor",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          role: "Learner",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          role: "Observer",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tbl_role", null, {});
  }
};
