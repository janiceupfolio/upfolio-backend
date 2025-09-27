import { NextFunction, Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import AuthService from "../../model/v1/user";

export class optionalUserAuthenticator {
  async authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    let loginToken = req?.headers["login-token"];
    if (!loginToken) {
      //@ts-ignore
      req.userInfo = null;
      next();
      return;
    }
    //@ts-ignore
    let userData = await AuthService.getCustomerAuthData(loginToken);
    if (!userData) {
      //@ts-ignore
      req.userInfo = null;
      next();
      return;
    }
    //@ts-ignore
    req.userInfo = userData;
    userData = JSON.parse(JSON.stringify(userData))
    //@ts-ignore
    req.headers["customer_info"] = userData;
    next();
  }
}