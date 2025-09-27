import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import LearnerService from "../../model/v1/learner";

class learnerController {
  // Create learner method
  static async createLearner(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await LearnerService.createLearner(data, userData);
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

  // Update learner method
  static async updateLearner(req: Request, res: Response): Promise<void> {
    try {
      let learnerId = req.params.id as string | number;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await LearnerService.updateLearner(
        learnerId,
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

  // List Learner method
  static async listLearner(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await LearnerService.listLearner(data, userData);
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

  // Detail Learner method
  static async detailLearner(req: Request, res: Response): Promise<void> {
    try {
      let learnerId = req.params.id as string | number;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await LearnerService.detailLearner(learnerId, userData);
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

  // Delete Learner method
  static async deleteLearner(req: Request, res: Response): Promise<void> {
    try {
      let learnerId = req.params.id as string | number
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await LearnerService.deleteLearner(
        learnerId,
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

export default learnerController;
