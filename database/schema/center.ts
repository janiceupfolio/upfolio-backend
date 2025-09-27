import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { CenterInterface } from "../../interface/center";

class Center extends Model<CenterInterface> implements CenterInterface {
  public id!: number;
  public center_name!: string;
  public center_admin!: number;
  public status!: number;
  public center_address!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  static findById: (id: number) => Promise<CenterInterface | null>;
}

Center.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    center_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    center_admin: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    center_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.CENTER,
  }
);

Center.findById = async (id) => 
  Center.findOne({
    where: { id, deletedAt: null }
  });

export default Center;
