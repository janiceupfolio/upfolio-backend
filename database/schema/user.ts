import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import { UserInterface } from "../../interface/user";
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import Qualifications from "./qualifications";
import Center from "./center";
import Role from "./role";

class User extends Model<UserInterface> implements UserInterface {
  public id!: number;
  public name!: string;
  public surname!: string;
  public login_token?: string;
  public phone_number?: string;
  public phone_code?: string;
  public email!: string;
  public role!: number;
  public password!: string;
  public about!: string;
  public trainee!: boolean;
  public date_of_birth!: string;
  public address!: string;
  public gender!: number;
  public learning_difficulties!: boolean;
  public off_the_job_training!: number;
  public entitlement_date!: string;
  public start_date!: string;
  public expected_end_date!: string;
  public employer!: string;
  public employer_address!: string;
  public center_id?: number; // Optional field for center association
  public theme_color!: string; // Added theme_color field
  public access_start_date!: string;
  public access_end_date!: string;
  public awarding_name!: string;
  public ethnicity!: string;
  public additional_iqa_id!: number; // Optional field for additional IQA ID
  public additional_assessor_id!: number; // Optional field for additional Assessor ID
  public additional_learning_text!: string;
  public default_center?: number; // Optional field for default center
  public additional_learning_needs!: number; // 1: Yes | 2: No | 3: Prefer not to say
  public license_year!: number;
  public license_year_expiry!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  static findUserData: (id: number) => Promise<UserInterface | null>;
}

User.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    login_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Super Admin: 1, Teacher: 2, Learner: 3, Observer: 4
    },
    theme_color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "primary", // Default theme color
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trainee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value: string) {
        // Hash the password before saving it
        const hashedPassword = require("bcrypt").hashSync(value, 10);
        this.setDataValue("password", hashedPassword);
      },
    },
    date_of_birth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "1: male | 2: female | 3: Prefer not say",
    },
    learning_difficulties: {
      type: DataTypes.BOOLEAN, // Or BOOLEAN if just yes/no
      allowNull: true,
    },
    off_the_job_training: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: Yes | 2: no",
    },
    entitlement_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expected_end_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    center_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional field for center association
    },
    employer_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    access_start_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    access_end_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    awarding_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ethnicity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    additional_learning_needs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 3, // 1: Yes | 2: No | 3: Prefer not to say
    },
    additional_learning_text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    default_center_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional field for default center
      comment: "Filed for default center, For Super Admin",
    },
    additional_iqa_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional field for additional IQA ID
      comment: "Optional field for additional IQA ID",
    },
    additional_assessor_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional field for additional Assessor ID
      comment: "Optional field for additional Assessor ID",
    },
    license_year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Learner License Year",
      defaultValue: 0
    },
    license_year_expiry: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Learner License Year Expiry"
    }
  },
  { ...BaseModel.initBaseOptions(sequelize), tableName: TABLE_NAME.USER }
);

User.belongsToMany(Qualifications, {
  through: "tbl_user_qualification",
  foreignKey: "user_id",
  otherKey: "qualification_id",
  as: "qualifications",
});

User.belongsToMany(User, {
  through: "tbl_user_assessor",
  foreignKey: "user_id",
  otherKey: "assessor_id",
  as: "assessors",
});

User.belongsToMany(User, {
  through: "tbl_user_iqa",
  foreignKey: "user_id",
  otherKey: "iqa_id",
  as: "iqas",
});

User.belongsToMany(User, {
  through: "tbl_user_learner",
  foreignKey: "user_id",
  otherKey: "learner_id",
  as: "learners",
});

User.belongsTo(Center, {
  foreignKey: "center_id",
  as: "center",
});

User.belongsTo(Role, {
  foreignKey: "role",
  as: "role_data",
});

User.findUserData = async (id) =>
  User.findOne({
    where: {
      id,
      deletedAt: null,
    },
    include: [
      {
        model: Qualifications,
        as: "qualifications",
        through: { attributes: [] }, // prevent including join table info
      },
      {
        model: Center,
        as: "center",
        attributes: ["id", "center_name"],
      },
      {
        model: Role,
        as: "role_data",
      }
    ],
  });

export default User;
