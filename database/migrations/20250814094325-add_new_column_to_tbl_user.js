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
    await queryInterface.addColumn("tbl_user", "access_start_date", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "access_end_date", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "awarding_name", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "ethnicity", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("tbl_user", "additional_learning_needs", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 3, // 1: Yes | 2: No | 3: Prefer not to say
    });
    // Add column to center table
    await queryInterface.addColumn("tbl_center", "center_address", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_user", "access_start_date");
    await queryInterface.removeColumn("tbl_user", "access_end_date");
    await queryInterface.removeColumn("tbl_user", "awarding_name");
    await queryInterface.removeColumn("tbl_user", "ethnicity");
    await queryInterface.removeColumn("tbl_user", "additional_learning_needs");
    // Remove column from center table
    await queryInterface.removeColumn("tbl_center", "center_address");
  }
};
