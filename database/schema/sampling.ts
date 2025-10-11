import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { SamplingInterface } from "../../interface/sampling";
import Units from "./units";
import Assessment from "./assessment";
import { Entity } from "../../configs/constants";
import Image from "./images";
import User from "./user";

class Sampling extends Model<SamplingInterface> implements SamplingInterface {
  public id!: number;
  public learner_id!: number;
  public date!: string;
  public assessor_id!: number;
  public sampling_type!: number;
  public qualification_id!: number;
  public iqa_notes!: string;
  public is_assessment_assessed!: string;
  public is_learner_work!: string;
  public is_assessed_by_other_assessor!: string;
  public is_learner_competance!: string;
  public is_assessment_sufficient!: string;
  public is_accept_sampling!: string;
  public action_date!: string;
  public further_action_note!: string;
  public reference_type!: number;
  public created_by!: number;
  public center_id!: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

Sampling.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    learner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assessor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sampling_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "1: Formative | 2: Interim | 3: Summative",
    },
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    iqa_notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_assessment_assessed: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_learner_work: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_assessed_by_other_assessor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_learner_competance: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_assessment_sufficient: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_accept_sampling: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    further_action_note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reference_type: {
      type: DataTypes.INTEGER,
      comment: "1: Unit | 2: Assessment",
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    center_id: {
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
    tableName: TABLE_NAME.SAMPLING,
  }
);

Sampling.belongsToMany(Units, {
  through: 'tbl_sampling_units',
  foreignKey: "sampling_id",
  otherKey: "unit_id",
  as: "units",
})

Sampling.belongsToMany(Assessment, {
  through: 'tbl_sampling_assessment',
  foreignKey: "sampling_id",
  otherKey: "assessment_id",
  as: "assessments",
})

Sampling.hasMany(Image, {
  foreignKey: "entity_id",
  as: "images_sampling",
  scope: {
    entity_type: Entity.SAMPLING,
  },
})

Sampling.hasOne(User, {
  as: "learner",
  foreignKey: "id",
  sourceKey: "learner_id"
})

export default Sampling;