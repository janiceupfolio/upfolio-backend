const path = require("path");
require("dotenv").config();
const Sequelize = require("sequelize");
const DB_CREDENTIAL = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  dialect: process.env.DB_CONNECTION,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  seederStorage: "sequelize",
  seederStorageTableName: "SequelizeMetaSeeders",
};
const sequelize = new Sequelize(DB_CREDENTIAL);
const connectWithRetry = async (retries = 5, delay = 5000) => {
  let count = 0;
  while (count < retries) {
    try {
      await sequelize.authenticate();
      console.log(`Database connection established successfully :)`);
      return;
    } catch (err) {
      count++;
      console.log(`Failed to connect to Database (attempt ${count}/${retries}): ${err.message}`);
      if (count === retries) {
        console.log("Failed to connect to Database after multiple attempts :(", err);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

connectWithRetry();

module.exports = {
  development: DB_CREDENTIAL,
  staging: DB_CREDENTIAL,
  production: DB_CREDENTIAL,
  sequelize: sequelize,
};
