import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { MethodsInterface } from "../../interface/methods";

class Methods extends Model<MethodsInterface> implements MethodsInterface {
  public id!: number;
  public code!: string;
  public name!: string;
  public description!: string;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

Methods.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.METHODS,
  }
);

export default Methods;