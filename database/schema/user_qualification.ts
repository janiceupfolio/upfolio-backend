import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { UserQualificationInterface } from "../../interface/user_qualification";

class UserQualification
  extends Model<UserQualificationInterface>
  implements UserQualificationInterface
{
  public id!: number;
  public user_id: number;
  public qualification_id: number;
  public status: number;
  public is_signed_off: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

UserQualification.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
    is_signed_off: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.USER_QUALIFICATION,
  }
);

export default UserQualification