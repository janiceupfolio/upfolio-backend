import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ModuleRecordsLearnerInterface } from "../../interface/module_records_learner";

class ModuleRecordsLearner
  extends Model<ModuleRecordsLearnerInterface>
  implements ModuleRecordsLearnerInterface
{
  public id!: number;
  public module_records_id!: number;
  public learner_id!: number;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

ModuleRecordsLearner.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    module_records_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    learner_id: {
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
    tableName: TABLE_NAME.MODULE_RECORDS_LEARNER,
  }
);

export default ModuleRecordsLearner;