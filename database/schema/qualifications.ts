import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { QualificationsInterface } from "../../interface/qualifications";
import Units from "./units";
import User from "./user";
import UserQualification from "./user_qualification";

class Qualifications
  extends Model<QualificationsInterface>
  implements QualificationsInterface
{
  public id!: number;
  public name!: string;
  public qualification_no!: string;
  public created_by!: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  static findById: (id: number) => Promise<QualificationsInterface | null>
}

Qualifications.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualification_no: {
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
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.QUALIFICATIONS,
  }
);

Qualifications.hasMany(Units, { foreignKey: 'qualification_id', as: 'units' });
Units.belongsTo(Qualifications, { foreignKey: 'qualification_id', as: 'qualification' });
Qualifications.hasMany(UserQualification, { foreignKey: 'qualification_id', as: 'userQualifications' });

Qualifications.findById = async (id) => 
  Qualifications.findOne({
    where: { id, deletedAt: null }
  })

export default Qualifications;
