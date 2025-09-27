import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessmentMarksInterface } from "../../interface/assessment_marks";
import Qualifications from "./qualifications";
import Units from "./units";

class AssessmentMarks
  extends Model<AssessmentMarksInterface>
  implements AssessmentMarksInterface
{
  public id!: number;
  public assessment_id!: number;
  public learner_id!: number;
  public assessor_id!: number;
  public qualification_id!: number;
  public unit_id!: number;
  public main_outcome_id!: number;
  public sub_outcome_id!: number;
  public subpoint_id!: number;
  public marks!: string;
  public max_marks!: string;
  public attempt!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
}

AssessmentMarks.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    learner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assessor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    main_outcome_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sub_outcome_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subpoint_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    marks: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "0",
    },
    max_marks: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "2",
    },
    attempt: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "1",
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSMENT_MARKS,
  }
);

// Define associations
AssessmentMarks.belongsTo(Qualifications, { foreignKey: 'qualification_id', as: 'qualification' });
AssessmentMarks.belongsTo(Units, { foreignKey: 'unit_id', as: 'unit' });

export default AssessmentMarks;
