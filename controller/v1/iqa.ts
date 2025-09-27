import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import IQAService from "../../model/v1/iqa";

class IQAController {
  // Create IQA method
  static async createIQA(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await IQAService.createIQA(data, userData);
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

  // Update IQA method
  static async updateIQA(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await IQAService.updateIQA(id, data, userData);
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

  // List IQA method
  static async listIQA(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await IQAService.listIQA(data, userData);
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

  // Delete IQA method
  static async deleteIQA(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await IQAService.deleteIQA(id, userData);
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

export default IQAController;
