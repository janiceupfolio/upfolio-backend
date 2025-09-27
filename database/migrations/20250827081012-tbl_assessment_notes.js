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
    await queryInterface.createTable("tbl_assessment_notes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "1=assessor, 2=learner, 3=eqa, 4=iqa, 5=admin, 6=supre admmin",
      },
      feedback: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      is_main_assessment_note: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "true=main assessment note, false=sub assessment note",
      },
      cycle: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("tbl_assessment_notes");
  }
};
