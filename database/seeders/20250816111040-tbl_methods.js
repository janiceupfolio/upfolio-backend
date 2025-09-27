// seeders/xxxx-seed-methods.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("tbl_methods", [
      {
        code: "DA",
        name: "Diagnostic Assessment",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "RPL",
        name: "Recognition of Prior Learning",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "PE",
        name: "Product Evidence",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "Q&A",
        name: "Questions and Answers",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "OBS",
        name: "Observation",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "PD",
        name: "Professional Discussion",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "EX",
        name: "Exam",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "AFL",
        name: "Assessment for Learning",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "APA/APL",
        name: "APA/APL",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "AS",
        name: "Assignment",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "O",
        name: "Other",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "Q",
        name: "Questioning",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "QA",
        name: "Oral Question and Answer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "WT",
        name: "Witness Testimony",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "IA",
        name: "Initial Assessment",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "SIM",
        name: "Simulation",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "PS",
        name: "Personal statements",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ISEL",
        name: "Online Task",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tbl_methods", null, {});
  },
};
