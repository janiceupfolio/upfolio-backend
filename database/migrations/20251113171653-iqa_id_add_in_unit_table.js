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
    await queryInterface.addColumn('tbl_user_units', 'iqa_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('tbl_assessment', 'iqa_id', {
      type: Sequelize.INTEGER,
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
    await queryInterface.removeColumn('tbl_user_units', 'iqa_id');
    await queryInterface.removeColumn('tbl_assessment', 'iqa_id');
  }
};
