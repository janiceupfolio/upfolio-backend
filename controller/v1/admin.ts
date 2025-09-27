import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import AdminService from "../../model/v1/admin";

class adminController {
  // Create Admin method
  static async createAdmin(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AdminService.createAdmin(data, userData);
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

  // Update Admin method
  static async updateAdmin(req: Request, res: Response): Promise<void> {
    try {
      let adminId = req.params.id as string | number;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AdminService.updateAdmin(adminId, data, userData);
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

  // List Admins method
  static async listAdmins(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AdminService.listAdmins(data, userData);
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

  // Delete Admin method
  static async deleteAdmin(req: Request, res: Response): Promise<void> {
    try {
      let adminId = req.params.id as string | number;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AdminService.deleteAdmin(adminId, userData);
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

export default adminController;