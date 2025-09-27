"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "tbl_user",
      [
        {
          name: "Janice",
          surname: "Doe",
          phone_number: "1234567890",
          phone_code: "+44",
          email: "janice@yopmail.com",
          password:
            "$2a$10$X4S640pt.Gj/PT4GYujWlOE69S9u8rne7wA.zc2KB1vJQx0TLaVWW",
          role: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Urmil",
          surname: "Parsaniya",
          phone_number: "0987654321",
          phone_code: "+44",
          email: "urmil@yopmail.com",
          password:
            "$2a$10$X4S640pt.Gj/PT4GYujWlOE69S9u8rne7wA.zc2KB1vJQx0TLaVWW",
          role: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Amit",
          surname: "Rai",
          phone_number: "0987654544",
          phone_code: "+44",
          email: "amit@yopmail.com",
          password:
            "$2a$10$X4S640pt.Gj/PT4GYujWlOE69S9u8rne7wA.zc2KB1vJQx0TLaVWW",
          role: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tbl_user", null, {});
  },
};
