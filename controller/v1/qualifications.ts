import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import qualificationService from "../../model/v1/qualifications";
import { userAuthenticationData } from "../../interface/user";

class qualificationController {
  // Create qualification method
  static async createQualification(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let file = req.file;
      let request = await qualificationService.createQualification(
        userData,
        file
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
  // Get qualifications method
  static async getQualifications(req: Request, res: Response): Promise<void> {
    try {
      let qualificationId = req.params.id as number | string;
      let assessmentId = req.query.assessment_id as number | string;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let learnerId = req.query.learner_id as number | string;
      
      let request = await qualificationService.getQualifications(
        qualificationId,
        userData,
        learnerId,
        assessmentId
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

  // Get qualifications list method
  static async getQualificationsList(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let data = req.query as any;
      let request = await qualificationService.getQualificationsList(
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

  // Delete qualification
  static async deleteQualification(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let data = req.params.id as string | number;
      let request = await qualificationService.deleteQualification(
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

  // Update Qualification
  static async updateQualification(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let qualificationId = req.params.id as string | number;
      let file = req.file;
      let request = await qualificationService.updateQualification(
        qualificationId,
        userData,
        file
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

  // Clean existing records method
  static async cleanExistingRecords(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await qualificationService.cleanExistingRecords();
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

export default qualificationController;
