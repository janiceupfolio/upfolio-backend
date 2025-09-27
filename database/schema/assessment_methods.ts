import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessmentMethodInterface } from "../../interface/assessment_methods";

class AssessmentMethod
  extends Model<AssessmentMethodInterface>
  implements AssessmentMethodInterface
{
  public id!: number;
  public assessment_id!: number;
  public method_id!: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

AssessmentMethod.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    method_id: {
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
    tableName: TABLE_NAME.ASSESSMENT_METHODS,
  }
);

export default AssessmentMethod;