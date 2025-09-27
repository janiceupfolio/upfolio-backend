import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ActivityInterface } from "../../interface/activity";
import User from "./user";

class Activity extends Model<ActivityInterface> implements ActivityInterface {
  public id!: number;
  public user_id: number;
  public activity: string;
  public activity_status: string;
  public center_id: number;
  public role: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

Activity.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    activity: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    activity_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    center_id: {
      type: DataTypes.NUMBER,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ACTIVITY,
  }
);

Activity.hasOne(User, {
  foreignKey: "id",
  sourceKey: "user_id",
  as: "user",
})

export default Activity;