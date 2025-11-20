import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import ReportsService from "../../model/v1/reports";

class ReportsController {
  // Get IQA Sampling Matrix Report method
  static async getIqaSamplingMatrixReport(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let userData = req.headers["user_info"] as userAuthenticationData;
      let data = req.query;
      let request = await ReportsService.getIqaSamplingMatrixReport(data, userData);
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

export default ReportsController;
