import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { SubOutcomesInterface } from "../../interface/sub_outcomes";
import OutcomeSubpoints from "./outcome_subpoints";

class SubOutcomes extends Model<SubOutcomesInterface> implements SubOutcomesInterface {
  public id!: number;
  public unit_id: number;
  public main_outcome_id: number;
  public qualification_id: number;
  public description!: string;
  public outcome_number!: string;
  public created_by!: number;
  public status!: number;
  public marks!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

SubOutcomes.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    main_outcome_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Reference to the main outcome",
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    outcome_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
    marks: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Marks for the sub outcome",
      defaultValue: "2",
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.OUTCOMES,
  }
);

SubOutcomes.hasMany(OutcomeSubpoints, { foreignKey: 'outcome_id', as: 'outcomeSubpoints' });
OutcomeSubpoints.belongsTo(SubOutcomes, { foreignKey: 'outcome_id', as: 'subOutcome' });

export default SubOutcomes;
