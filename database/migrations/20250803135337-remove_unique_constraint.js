'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('tbl_qualifications', 'qualification_no', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('tbl_units', 'unit_ref_no', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('tbl_user', 'theme_color', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'primary',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('tbl_qualifications', 'qualification_no', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.changeColumn('tbl_units', 'unit_ref_no', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.removeColumn('tbl_user', 'theme_color');
  }
};
