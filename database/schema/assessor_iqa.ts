import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { AssessorIQAInterface } from "../../interface/assessor_iqa";

class AssessorIQA
  extends Model<AssessorIQAInterface>
  implements AssessorIQAInterface
{
  public id!: number;
  public assessor_id!: number;
  public iqa_id!: number;
  public qualification_ids!: number[];
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  static findById: (id: number) => Promise<AssessorIQAInterface | null>;
}

AssessorIQA.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    assessor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    iqa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualification_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.ASSESSOR_IQA,
  }
);

AssessorIQA.findById = async (id) => 
  AssessorIQA.findOne({
    where: { id, deletedAt: null }
  });
  
export default AssessorIQA;