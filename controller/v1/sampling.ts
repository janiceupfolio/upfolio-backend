import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import { senitizeObject } from "../../helper/utils";
import SamplingService from "../../model/v1/sampling";

class SamplingController {
  // Create Sampling
  static async createSampling(req: Request, res: Response): Promise<void> {
    try {
      let data = await senitizeObject(req.body);
      let files = req.files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.createSampling(data, userData, files);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Update Sampling
  static async updateSampling(req: Request, res: Response): Promise<void> {
    try {
      let data = await senitizeObject(req.body);
      data.id = +req.params.id;
      let files = req.files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.updateSampling(data, userData, files);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Delete Sampling
  static async deleteSampling(req: Request, res: Response): Promise<void> {
    try {
      let id = +req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.deleteSampling(id, userData);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Get Sampling
  static async getSampling(req: Request, res: Response): Promise<void> {
    try {
      let id = +req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.getSampling(id);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // List Sampling
  static async listSampling(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.listSampling(data, userData);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }

  // Get Sampling Matrix by Qualification
  static async getSamplingMatrixByQualification(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await SamplingService.getSamplingMatrixByQualification(data, userData);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(request.status, request.data, request.message);
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }
}

export default SamplingController;