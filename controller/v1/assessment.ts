import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import AssessmentService from "../../model/v1/assessment";

class assessmentController {
  // Create Assessment
  static async createAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      //@ts-ignore
      let files = req.files?.files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.createAssessment(data, userData, files);
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

  // Update Assessment 
  static async updateAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      //@ts-ignore
      let files = req.files?.files || [];
      //@ts-ignore
      let learnerFiles = req.files?.learner_upload_files || [];
      let assessmentId = req.params.id;
      let request = await AssessmentService.updateAssessment(data, userData, files, assessmentId, learnerFiles);
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

  // List Assessment
  static async listAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.listAssessment(data, userData);
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

  // Delete Assessment
  static async deleteAssessment(req: Request, res: Response): Promise<void> {
    try {
      let assessmentId = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.deleteAssessment(assessmentId, userData);
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

  // Get Assessment
  static async getAssessment(req: Request, res: Response): Promise<void> {
    try {
      let assessmentId = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.getAssessmentById(assessmentId, userData);
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

  // Update Assessment Status
  static async updateAssessmentStatus(req: Request, res: Response): Promise<void> {
    try {
      let assessmentId: string = req.params.id; 
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.updateAssessmentStatus(data, assessmentId, userData);
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

  // Statistics
  static async statistics(req: Request, res: Response): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let data = req.query
      let request = await AssessmentService.statistics(data, userData);
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

  // Create Assessment with Chunk Upload
  static async createAssessmentWithChunkUpload(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      //@ts-ignore
      let files = req.files?.files || [];
      //@ts-ignore
      let learnerFiles = req.files?.learner_upload_files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let chunkSize = data.chunkSize || 5 * 1024 * 1024; // Default 5MB
      
      let request = await AssessmentService.createAssessmentWithChunkUpload(
        data, 
        userData, 
        files, 
        learnerFiles, 
        chunkSize
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

export default assessmentController;