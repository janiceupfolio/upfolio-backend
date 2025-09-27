import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import ModuleRecordsService from "../../model/v1/modules_records";

class ModuleRecordsController {
  // Create module records
  static async createModuleRecords(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      //@ts-ignore
      let files = req.files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await ModuleRecordsService.createModuleRecords(data, userData, files);
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

  // update module records
  static async updateModuleRecords(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let data = req.body;
      //@ts-ignore
      let files = req.files || [];
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await ModuleRecordsService.updateModuleRecords(+id, data, userData, files);
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

  // List module records
  static async listModuleRecords(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await ModuleRecordsService.listModuleRecords(data, userData);
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

  // Delete module records
  static async deleteModuleRecords(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await ModuleRecordsService.deleteModuleRecords(+id, data, userData);
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

export default ModuleRecordsController;
