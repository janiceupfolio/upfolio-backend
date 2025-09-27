import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { UnitsInterface } from "../../interface/units";
import SubOutcomes from "./sub_outcomes";

class Units extends Model<UnitsInterface> implements UnitsInterface {
  public id!: number;
  public qualification_id: number;
  public unit_title!: string;
  public unit_number!: string;
  public unit_ref_no!: string;
  public created_by!: number;
  public status!: number;
  public marks!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

Units.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    qualification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit_ref_no: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
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
      comment: "Marks for the unit",
      defaultValue: "2",
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.UNITS,
  }
);

Units.hasMany(SubOutcomes, {foreignKey: "unit_id", as: "subOutcomes"});
SubOutcomes.belongsTo(Units, { foreignKey: 'unit_id', as: 'unit' });

export default Units;
