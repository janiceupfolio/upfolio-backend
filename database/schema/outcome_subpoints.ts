import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { OutcomeSubpointsInterface } from "../../interface/outcome_subpoints";

class OutcomeSubpoints
  extends Model<OutcomeSubpointsInterface>
  implements OutcomeSubpointsInterface
{
  public id!: number;
  public outcome_id: number;
  public point_text!: string;
  public created_by!: number;
  public status!: number;
  public marks!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

OutcomeSubpoints.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    outcome_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    point_text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
    marks: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Marks for the outcome subpoint",
      defaultValue: "2",
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.OUTCOME_SUBPOINTS,
  }
);

export default OutcomeSubpoints;