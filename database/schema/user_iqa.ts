import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { UserIQAInterface } from "../../interface/user_iqa";

class UserIQA
  extends Model<UserIQAInterface>
  implements UserIQAInterface
{
  public id!: number;
  public user_id: number;
  public iqa_id: number;
  public status: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

UserIQA.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    iqa_id: {
      type: DataTypes.INTEGER,
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
    tableName: TABLE_NAME.USER_IQA,
  }
);

export default UserIQA;