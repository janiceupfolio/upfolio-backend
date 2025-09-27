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
import { AssessmentNoteFilesInterface } from "../../interface/assessment_note_files";

class AssessmentNoteFiles
  extends Model<AssessmentNoteFilesInterface>
  implements AssessmentNoteFilesInterface
{
  public id!: number;
  public assessment_note_id!: number;
  public file_id!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date;
  public status!: number;
}

AssessmentNoteFiles.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessment_note_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    file_id: {
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
    tableName: TABLE_NAME.ASSESSMENT_NOTE_FILES,
  }
);

export default AssessmentNoteFiles;