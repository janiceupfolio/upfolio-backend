import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import CenterAdminService from "../../model/v1/center_admin";

class CenterAdminController {
  static async createCenterAdmin(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await CenterAdminService.createCenterAdmin(data, userData);
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

  static async updateCenterAdmin(req: Request, res: Response): Promise<void> {
    try {
      let centerAdminId = req.params.centerAdminId as string | number;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await CenterAdminService.updateCenterAdmin(centerAdminId, data, userData);
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

  static async deleteCenterAdmin(req: Request, res: Response): Promise<void> {
    try {
      let centerAdminId = req.params.centerAdminId as string | number;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await CenterAdminService.deleteCenterAdmin(centerAdminId, userData);
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

  static async listCenterAdmins(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await CenterAdminService.listCenterAdmins(data, userData);
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

export default CenterAdminController;