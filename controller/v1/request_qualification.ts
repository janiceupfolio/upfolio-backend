import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import RequestQualificationService from "../../model/v1/request_qualification";

class RequestQualificationController {
  // Create Request Qualification method
  static async createRequestQualification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request =
        await RequestQualificationService.createRequestQualification(
          req.body,
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

  // Update Request Qualification
  static async updateRequestQualification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request =
        await RequestQualificationService.updateRequestQualification(
          req.body,
          userData,
          req.params.id
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

  // Delete Request Qualification
  static async deleteRequestQualification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request =
        await RequestQualificationService.deleteRequestQualification(
          req.params.id,
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

  // List Request Qualification
  static async listRequestQualification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let data = req.query
      let request =
        await RequestQualificationService.listRequestQualification(data, userData);
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

export default RequestQualificationController;
