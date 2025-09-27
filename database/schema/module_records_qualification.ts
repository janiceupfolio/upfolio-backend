import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ModuleRecordsQualificationInterface } from "../../interface/module_records_qualification";

class ModuleRecordsQualification
  extends Model<ModuleRecordsQualificationInterface>
  implements ModuleRecordsQualificationInterface
{
  public id!: number;
  public module_records_id!: number;
  public qualification_id!: number;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

ModuleRecordsQualification.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    module_records_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_id: {
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
    tableName: TABLE_NAME.MODULE_RECORDS_QUALIFICATION,
  }
);

export default ModuleRecordsQualification;