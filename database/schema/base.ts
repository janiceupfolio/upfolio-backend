import { Model, DataTypes } from "sequelize";

export default class BaseModel extends Model {
  static initBaseModel(sequelize: any) {
    return {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    };
  }

  static initBaseOptions(sequelize: any) {
    return {
      sequelize, // Pass the sequelize instance explicitly
      timestamps: true,
      paranoid: true, // Enables soft delete
    };
  }
}
