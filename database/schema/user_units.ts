import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { UserUnitsInterface } from "../../interface/user_units";

class UserUnits extends Model<UserUnitsInterface> implements UserUnitsInterface {
  public id!: number;
  public user_id: number;
  public unit_id: number;
  public is_sampling: boolean;
  public reference_type: number;
  public is_assigned: boolean;
  public status: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

UserUnits.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_sampling: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    reference_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: Unit | 2: Assessment",
    },
    is_assigned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.USER_UNITS,
  }
);

export default UserUnits;