import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import EQAService from "../../model/v1/eqa";

class EQAController {
  // Create EQA method
  static async createEQA(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await EQAService.createEQA(data, userData);
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

  // Update EQA method
  static async updateEQA(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await EQAService.updateEQA(id, data, userData);
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

  // List EQA method
  static async listEQA(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await EQAService.listEQA(data, userData);
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

  // Delete EQA method
  static async deleteEQA(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await EQAService.deleteEQA(id, userData);
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

export default EQAController;
