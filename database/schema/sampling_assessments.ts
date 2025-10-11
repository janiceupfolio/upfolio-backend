import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { SamplingAssessmentsInterface } from "../../interface/sampling_assessments";

class SamplingAssessments extends Model<SamplingAssessmentsInterface> implements SamplingAssessmentsInterface {
  public id!: number;
  public sampling_id!: number;
  public assessment_id!: number;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

SamplingAssessments.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    sampling_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.SAMPLING_ASSESSMENT,
  }
);

export default SamplingAssessments;