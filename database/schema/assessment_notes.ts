import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import Methods from "./methods";
import Units from "./units";
import Image from "./images";
import { Entity } from "../../configs/constants";
import AssessmentLearner from "./assessment_learners";
import User from "./user";
import Qualifications from "./qualifications";
import { AssessmentNotesInterface } from "../../interface/assessment_notes";
import AssessmentNoteFiles from "./assessment_note_files";

class AssessmentNotes
  extends Model<AssessmentNotesInterface>
  implements AssessmentNotesInterface
{
  public id!: number;
  public assessment_id!: number;
  public user_id!: number;
  public uploaded_by!: string;
  public feedback!: string;
  public is_main_assessment_note!: boolean;
  public cycle!: number;
  public workflow_phase!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date;
  public status!: number;
}

AssessmentNotes.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Role Slug",
    },
    feedback: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    is_main_assessment_note: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "true=main assessment note, false=sub assessment note",
    },
    cycle: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    workflow_phase: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "We manage this paramter for show or hide feedback in learner of iqa"
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSMENT_NOTES,
  }
);

AssessmentNotes.belongsToMany(Image, {
  through: AssessmentNoteFiles,
  foreignKey: "assessment_note_id",
  otherKey: "file_id",
  as: "files",
})

AssessmentNotes.hasOne(User, {
  foreignKey: "id",
  sourceKey: "user_id",
  as: "user",
})

export default AssessmentNotes;