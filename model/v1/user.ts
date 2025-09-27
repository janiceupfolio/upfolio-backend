require("dotenv").config();
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import {
  AuthResponse,
  userAuthenticationData,
  UserInterface,
} from "../../interface/user";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import Center from "../../database/schema/center";
import Role from "../../database/schema/role";
import UserQualification from "../../database/schema/user_qualification";
import { Op } from "sequelize";
const jwtSecret = process.env.JWT_SECRET || "";
const AccessTokenExpiration = process.env.ACCESS_TOKEN_EXPIRATION || "";

class userAuthService {
  // Login method for user authentication
  static async userAuth(data: UserInterface, requestFrom?: boolean): Promise<AuthResponse> {
    try {
      // check is valid customer
      let isUser
      if (requestFrom == true) {
        isUser = await User.findOne({
          where: {
            id: data.id,
            deletedAt: null,
          },
        });
      } else {
        isUser = await User.findOne({
          where: {
            email: data.email,
            deletedAt: null,
          },
        });
      }
      if (!isUser) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: STATUS_MESSAGE.USER.ERROR_MESSAGE.USER_NOT_FOUND,
        };
      }
      // check password
      let password = requestFrom == false ? await compare(data.password, isUser.password) : true;
      if (!password) {
        return {
          status: STATUS_CODES.UNAUTHORIZED,
          message: STATUS_MESSAGE.USER.ERROR_MESSAGE.INVALID_CREDENTIAL,
        };
      }
      // login token generate
      const loginToken = await jwt.sign({ id: isUser.id }, jwtSecret, {
        expiresIn: AccessTokenExpiration,
      });
      // update customer
      await User.update(
        { login_token: loginToken },
        { where: { id: isUser.id } }
      );
      let userData = await User.findUserData(isUser.id);
      // Check login user is Super Admin
      if (userData.role == Roles.SUPER_ADMIN) {
        // check if user has default center or not id not then assign default center
        if (!userData.default_center_id) {
          // Assign default center to user
          const defaultCenter = await Center.findOne({
            where: { deletedAt: null, status: 1 },
          });
          if (defaultCenter) {
            await User.update(
              { default_center_id: defaultCenter.id },
              { where: { id: userData.id } }
            );
            userData.default_center_id = defaultCenter.id; // Update userData with new center
          }
        }
      }
      if (userData.role == Roles.LEARNER) {
        userData = JSON.parse(JSON.stringify(userData));
        userData.qualifications = await Promise.all(
          //@ts-ignore
          userData.qualifications.map(async (q: any) => {
            let userQualification = await UserQualification.findOne({
              where: { user_id: userData.id, qualification_id: q.id },
              attributes: ["is_signed_off"],
              raw: true,
            });

            return {
              ...q,
              is_signed_off: userQualification
                ? userQualification.is_signed_off
                : null,
            };
          })
        );
      }
      // Check if in same center with entered email address have multiple users then send new Array of objects
      if (userData.center_id) {
        userData = JSON.parse(JSON.stringify(userData));
        let user_other_accounts = await User.findAll({
          where: {
            email: userData.email,
            center_id: userData.center_id,
            deletedAt: null,
            id: { [Op.ne]: userData.id },
          },
          attributes: ["id", "name", "email"],
          include: {
            model: Role,
            as: "role_data",
            attributes: ["id", "role", "role_slug"],
          },
        });
        //@ts-ignore
        user_other_accounts = await Promise.all(user_other_accounts.map(async (user: any) => {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role_data.role,
            role_slug: user.role_data.role_slug
          };
        }));
        //@ts-ignore
        userData.user_other_accounts = user_other_accounts;
      }
      return {
        data: userData,
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.USER.USER_LOGIN,
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "server error",
      };
    }
  }

  // Get user authentication data
  static async getUserAuthData(
    loginToken: string
  ): Promise<UserInterface | null> {
    if (!loginToken) {
      return null;
    }
    let adminData = await User.findOne({
      where: {
        login_token: loginToken,
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
        },
        {
          model: Role,
          as: "role_data",
        },
      ],
    });
    return adminData || null;
  }

  // Update user profile
  static async updateUserProfile(
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<AuthResponse> {
    // check if valid user
    let isUser = await User.findOne({
      where: {
        id: userData.id,
        deletedAt: null,
      },
    });
    if (!isUser) {
      return {
        status: STATUS_CODES.NOT_FOUND,
        message: STATUS_MESSAGE.USER.ERROR_MESSAGE.USER_NOT_FOUND,
      };
    }
    // update user data
    await User.update(data, { where: { id: isUser.id } });
    let userData_ = await User.findUserData(isUser.id);
    return {
      data: userData_,
      status: STATUS_CODES.SUCCESS,
      message: STATUS_MESSAGE.USER.USER_UPDATED,
    };
  }

  // Update Password
  static async updatePassword(
    data: any,
    userData: userAuthenticationData
  ): Promise<AuthResponse> {
    // check if valid user
    let isUser = await User.findOne({
      where: {
        id: userData.id,
        deletedAt: null,
      },
    });
    if (!isUser) {
      // Check if in data pass token
      if (data.token) {
        // Decode jwt token
        let decoded = jwt.verify(data.token, jwtSecret);
        // check if user exist
        isUser = await User.findOne({
          where: { id: decoded.id },
        });
        if (!isUser) {
          return {
            status: STATUS_CODES.NOT_FOUND,
            message: STATUS_MESSAGE.USER.ERROR_MESSAGE.USER_NOT_FOUND,
          };
        }
      }
    }

    // update password
    await User.update(
      { password: data.password },
      { where: { id: isUser.id } }
    );
    return {
      status: STATUS_CODES.SUCCESS,
      message: "Password Updated Successfully",
    };
  }

  // Login using user id
  static async loginUsingUserId(data: any): Promise<AuthResponse> {
    let user = await this.userAuth({ id: data.user_id } as UserInterface, true);
    if (user.status !== STATUS_CODES.SUCCESS) {
      return {
        status: user.status,
        message: user.message,
      };
    }
    return {
      status: STATUS_CODES.SUCCESS,
      data: user.data,
      message: "User Login Successfully",
    };
  }
}

export default userAuthService;
