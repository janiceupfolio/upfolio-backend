import { NextFunction, Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import AuthService from "../../model/v1/user";

export class Authenticator {
  async authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    let loginToken = req?.headers["login-token"];
    if (!loginToken) {
      res.handler.errorResponse(
        STATUS_CODES.EXPECTATION_FAILED,
        STATUS_MESSAGE.VALIDATION.TOKEN.TOKEN_VALIDATION
      );
      return;
    }
    //@ts-ignore
    let userData = await AuthService.getUserAuthData(loginToken);
    if (!userData) {
      res.handler.errorResponse(
        STATUS_CODES.EXPECTATION_FAILED,
        STATUS_MESSAGE.VALIDATION.TOKEN.TOKEN_VALIDATION
      );
      return;
    }
    //@ts-ignore
    req.userInfo = userData;
    userData = JSON.parse(JSON.stringify(userData))
    // @ts-ignore
    req.headers["user_info"] = userData;
    next();
  }
}
