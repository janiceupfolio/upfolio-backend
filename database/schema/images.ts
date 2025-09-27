import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ImageInterface } from "../../interface/images";

class Image
  extends Model<ImageInterface>
  implements ImageInterface
{
  public id!: number;
  public entity_type!: string;
  public entity_id!: number;
  public image!: string;
  public image_type!: string;
  public image_name!: string;
  public image_size!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Image.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    entity_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image_size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.IMAGE,
  }
);

export default Image;