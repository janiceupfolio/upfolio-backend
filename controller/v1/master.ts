import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import MasterService from "../../model/v1/master";

class MasterController {
  // Get All Roles method
  static async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await MasterService.getAllRoles();
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

  // Get All Centers method
  static async getAllCenters(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      // Assuming a method exists in MasterService to get centers
      let request = await MasterService.getAllCenters();
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

  // Get All Methods method
  static async getAllMethods(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await MasterService.getAllMethods();
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

  // Signed Off Qualification
  static async signedOff(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await MasterService.signedOff(req.body, userData);
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

  // Get Dashboard method
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await MasterService.getDashboard(data, userData);
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

export default MasterController;