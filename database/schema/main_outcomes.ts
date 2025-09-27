import { Model, DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { MainOutcomesInterface } from "../../interface/main_outcomes";

class MainOutcomes extends Model<MainOutcomesInterface> implements MainOutcomesInterface {
  public id!: number;
  public qualification_id: number;
  public unit_id: number;
  public main_number!: string;
  public description!: string;
  public created_by!: number;
  public status!: number; // 1: Active, 2: Inactive
  public marks!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MainOutcomes.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    main_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
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
      comment: "Marks for the main outcome",
      defaultValue: "2",
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.MAIN_OUTCOMES,
  }
);

export default MainOutcomes;