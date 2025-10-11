import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { SamplingUnitsInterface } from "../../interface/sampling_units";

class SamplingUnits extends Model<SamplingUnitsInterface> implements SamplingUnitsInterface {
  public id!: number;
  public sampling_id!: number;
  public unit_id!: number;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

SamplingUnits.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    sampling_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit_id: {
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
    tableName: TABLE_NAME.SAMPLING_UNITS,
  }
);

export default SamplingUnits;