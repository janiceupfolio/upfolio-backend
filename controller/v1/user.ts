import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import userAuthService from "../../model/v1/user";
import { userAuthenticationData, UserInterface } from "../../interface/user";

class userAuthController {
  // Login method for user authentication
  static async login(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let request = await userAuthService.userAuth(data);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(
        request.status,
        request.data,
        request.message
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Get user profile method
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      //@ts-ignore
      let userData = req.userInfo
      res.handler.successResponse(
        STATUS_CODES.SUCCESS,
        userData,
        STATUS_MESSAGE.USER.USER_INFO
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Update user profile method
  static async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      let data: UserInterface = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await userAuthService.updateUserProfile(data, userData);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(
        request.status,
        request.data,
        request.message
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Update Password
  static async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      let data: UserInterface = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await userAuthService.updatePassword(data, userData);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(
        request.status,
        request.data,
        request.message
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Login using user id
  static async loginUsingUserId(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let request = await userAuthService.loginUsingUserId(data);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(
        request.status,
        request.data,
        request.message
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }
}

export default userAuthController;