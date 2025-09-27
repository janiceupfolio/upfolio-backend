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
    await queryInterface.addColumn("tbl_user", "license_year", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true,
      comment: "Learner License Year",
    })
    await queryInterface.addColumn("tbl_user", "license_year_expiry", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Learner License Year Expiry"
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_user", "license_year");
    await queryInterface.removeColumn("tbl_user", "license_year_expiry");
  }
};
