import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessmentUnitsInterface } from "../../interface/assessment_units";

class AssessmentUnits
  extends Model<AssessmentUnitsInterface>
  implements AssessmentUnitsInterface
{
  public id!: number;
  public assessment_id!: number;
  public unit_id!: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

AssessmentUnits.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSMENT_UNITS,
  }
);

export default AssessmentUnits
