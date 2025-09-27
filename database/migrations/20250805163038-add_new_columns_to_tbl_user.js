"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tbl_user", "date_of_birth", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "address", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "gender", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: male | 2: female | 3: Prefer not say",
    });

    await queryInterface.addColumn("tbl_user", "learning_difficulties", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "off_the_job_training", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: Yes | 2: No",
    });

    await queryInterface.addColumn("tbl_user", "entitlement_date", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "start_date", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "expected_end_date", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("tbl_user", "employer", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tbl_user", "date_of_birth");
    await queryInterface.removeColumn("tbl_user", "address");
    await queryInterface.removeColumn("tbl_user", "gender");
    await queryInterface.removeColumn("tbl_user", "learning_difficulties");
    await queryInterface.removeColumn("tbl_user", "off_the_job_training");
    await queryInterface.removeColumn("tbl_user", "entitlement_date");
    await queryInterface.removeColumn("tbl_user", "start_date");
    await queryInterface.removeColumn("tbl_user", "expected_end_date");
    await queryInterface.removeColumn("tbl_user", "employer");
  },
};
