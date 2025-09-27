import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { RoleInterface } from "../../interface/role";

class Role extends Model<RoleInterface> implements RoleInterface {
  public id!: number;
  public role!: string;
  public role_slug!: string;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

Role.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    role_slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ROLE,
  }
);

export default Role