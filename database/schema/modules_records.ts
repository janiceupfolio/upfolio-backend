import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ModuleRecordsInterface } from "../../interface/modules_records";
import Image from "./images";
import { Entity } from "../../configs/constants";
import User from "./user";
import Qualifications from "./qualifications";

class ModuleRecords
  extends Model<ModuleRecordsInterface>
  implements ModuleRecordsInterface
{
  public id!: number;
  public module_type: number;
  public title: string;
  public notes: string;
  public date: string;
  public center_id: number;
  public created_by: number;
  public is_learner_or_qualification: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

ModuleRecords.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    module_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    center_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_learner_or_qualification: {
      type: DataTypes.INTEGER,
      comment: "1: Learner, 2: Qualification",
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.MODULE_RECORDS,
  }
);

ModuleRecords.hasMany(Image, {
  foreignKey: "entity_id",
  as: "images_module_records",
  scope: {
    entity_type: Entity.MODULE_RECORDS,
  },
});

ModuleRecords.belongsToMany(User, {
  through: 'tbl_module_records_learner',
  foreignKey: "module_records_id",
  otherKey: "learner_id",
  as: "module_records_learners",
});

ModuleRecords.belongsToMany(Qualifications, {
  through: 'tbl_module_records_qualification',
  foreignKey: "module_records_id",
  otherKey: "qualification_id",
  as: "module_records_qualifications",
});

export default ModuleRecords