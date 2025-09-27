import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessmentInterface } from "../../interface/assessment";
import Methods from "./methods";
import Units from "./units";
import Image from "./images";
import { Entity } from "../../configs/constants";
import AssessmentLearner from "./assessment_learners";
import User from "./user";
import Qualifications from "./qualifications";
import AssessmentNotes from "./assessment_notes";
import AssessmentNoteFiles from "./assessment_note_files";

class Assessment
  extends Model<AssessmentInterface>
  implements AssessmentInterface
{
  public id!: number;
  public title!: string;
  public date!: string;
  public location!: string;
  public details!: string;
  public status!: number;
  public assessor_id!: number;
  public center_id!: number;
  public qualification_id!: number;
  public assessment_status!: number;
  public feedback!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Assessment.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    assessor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    center_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assessment_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: create | 2: learner agreed | 3: assessor reject | 4: completed | 5: not agreed by IQA | 6: agreed by IQA"
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSMENT,
  }
);

Assessment.belongsToMany(Methods, {
  through: 'tbl_assessment_methods',
  foreignKey: "assessment_id",
  otherKey: "method_id",
  as: "methods",
});

Assessment.belongsToMany(Units, {
  through: 'tbl_assessment_units',
  foreignKey: "assessment_id",
  otherKey: "unit_id",
  as: "units",
});

Assessment.hasMany(Image, {
  foreignKey: "entity_id",
  as: "images",
  scope: {
    entity_type: Entity.ASSESSMENT
  }
});

Assessment.hasMany(Image, {
  foreignKey: "entity_id",
  as: "learner_image",
  scope: {
    entity_type: Entity.LEARNER_ASSESSMENT
  }
})

Assessment.belongsToMany(User, {
  through: 'tbl_assessment_learner',
  foreignKey: "assessment_id",
  otherKey: "learner_id",
  as: "learners"
})

Assessment.hasOne(User, {
  foreignKey: "id",
  sourceKey: "assessor_id",
  as: "assessor"
})

Assessment.hasOne(Qualifications, {
  foreignKey: "id",
  sourceKey: "qualification_id",
  as: "qualification"
})

Assessment.hasOne(AssessmentNotes, {
  foreignKey: "assessment_id",
  sourceKey: "id",
  as: "questionnaires",
})

Assessment.hasMany(AssessmentNotes, {
  foreignKey: "assessment_id",
  sourceKey: "id",
  as: "evidence_cycles",
})

export default Assessment;