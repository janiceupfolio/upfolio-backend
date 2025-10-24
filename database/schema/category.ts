import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { CategoryInterface } from "../../interface/category";

class Category extends Model<CategoryInterface> implements CategoryInterface {
  public id!: number;
  public category_name!: string;
  public status!: number;
  public is_mandatory!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
}

Category.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    category_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.CATEGORY,
  }
);

export default Category;