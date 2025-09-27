import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { RequestQualificationInterface } from "../../interface/request_qualification";
import Center from "./center";

class RequestQualification
  extends Model<RequestQualificationInterface>
  implements RequestQualificationInterface
{
  public id!: number;
  public status!: number;
  public awarding_body!: string;
  public qualification_title!: string;
  public qualification_number!: string;
  public note!: string;
  public request_status!: number;
  public center_id!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

RequestQualification.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    awarding_body: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualification_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualification_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    center_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    request_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: Pending | 2: Approved | 3: Rejected",
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.REQUEST_QUALIFICATION,
  }
);

RequestQualification.hasOne(Center, {
  foreignKey: "id",
  sourceKey: "center_id",
  as: "center",
});

export default RequestQualification