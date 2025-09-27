import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import AssessorService from "../../model/v1/assessor";
import { userAuthenticationData } from "../../interface/user";

class assessorController {
  // Create Assessor
  static async createAssessor(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessorService.createAssessor(data, userData);
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

  // Update Assessor
  static async updateAssessor(req: Request, res: Response): Promise<void> {
    try {
      let assessorId = req.params.id as string | number;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessorService.updateAssessor(
        data,
        assessorId,
        userData
      );
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

  // List Assessor
  static async listAssessor(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessorService.listAssessor(
        data,
        userData
      );
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

  static async deleteAssessor(req: Request, res: Response): Promise<void> {
    try {
      let assessorId = req.params.id as string | number
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessorService.deleteAssessor(
        assessorId,
        userData
      );
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

export default assessorController;
