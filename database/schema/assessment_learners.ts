import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessmentLearnerInterface } from "../../interface/assessment_learner";
import Assessment from "./assessment";

class AssessmentLearner
  extends Model<AssessmentLearnerInterface>
  implements AssessmentLearnerInterface
{
  public id!: number;
  public learner_id!: number;
  public assessment_id!: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

AssessmentLearner.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    learner_id: {
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
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSMENT_LEARNER,
  }
);

AssessmentLearner.hasOne(Assessment, {
  foreignKey: "id",
  sourceKey: "assessment_id",
  as: "assessment"
})

export default AssessmentLearner