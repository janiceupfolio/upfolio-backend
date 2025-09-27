import { Response, Request } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../configs/constants";
import * as utils from "../helper/utils";

interface ResponsePayload {
  data: any;
  message: string;
  status_code: number;
  total_count?: number;
}

class ResponseHandler {
  private req: Request;
  private res: Response;
  private url?: string;

  constructor(req: Request, res: Response) {
    this.req = req;
    this.res = res;
    this.url = req?.originalUrl;
  }

  // Custom Response
  async customResponse(code: number = 200, response: any): Promise<void> {
    response = await utils.cleanResponse(response);
    this.res.status(code).send(response);
  }

  // Error Response
  async errorResponse(code: number, message: string): Promise<void> {
    let response: ResponsePayload = {
      data: null,
      message: message,
      status_code: code,
    };
    response = await utils.cleanResponse(response);
    this.res.status(code).send(response);
  }

  // Success Response
  async successResponse(code: number, data: any, message: string, total_count: number): Promise<void> {
    let response: ResponsePayload = {
      data: data,
      message: message,
      status_code: code,
      total_count: total_count
    };
    response = await utils.cleanResponse(response);
    this.res.status(code).send(response);
  }

  // Common Sender Response
  async sender(
    code: number = 200,
    message: string = "",
    data: any = null,
    error: any = null
  ): Promise<void> {
    let response: ResponsePayload = {
      data: data,
      message: error ? error : message,
      status_code: code,
    };
    response = await utils.cleanResponse(response);
    this.res.status(code).send(response);
    if (error) {
      // HANDLE LOGS AND OTHER STUFF
      console.error("ResponseHandler -> sender -> error", error);
    }
  }

  // 2XX SUCCESS
  async success(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.SUCCESS,
      message || "Request has been completed successfully.",
      data,
      info
    );
  }

  async created(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.CREATED,
      message || "Request has been created successfully.",
      data,
      info
    );
  }

  // 4XX CLIENT ERROR
  async badRequest(data: any, message?: string, info?: any): Promise<void> {
    if (data) {
      data = await utils.cleanResponse(data);
    }
    this.sender(
      STATUS_CODES.BAD_REQUEST,
      message || "Request line contained invalid characters.",
      data,
      info
    );
  }

  async unauthorized(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.UNAUTHORIZED,
      message || "You are not authorized to access.",
      data,
      info
    );
  }

  async forbidden(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.FORBIDDEN,
      message || "You are not authorized to access.",
      data,
      info
    );
  }

  async notFound(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.NOT_FOUND,
      message || "Resource associated with the request could not be found.",
      data,
      info
    );
  }

  async notAllowed(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.NOT_ALLOWED,
      message || "This operation is not allowed.",
      undefined,
      info
    );
  }

  async conflict(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.CONFLICT,
      message || "Provided information already exist!",
      data,
      info
    );
  }

  async tooManyRequest(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.TOO_MANY_REQUESTS,
      message || "Too Many Request.",
      data,
      info
    );
  }

  async preconditionFailed(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.PRECONDITION_FAILED,
      message || "Please complete other steps first",
      data,
      info
    );
  }

  async validationError(data: any, message?: string, info?: any): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.VALIDATION_ERROR,
      message || "Validation error!",
      data,
      info
    );
  }

  // 5XX SERVER ERROR
  async serverError(error: any, data: any, message?: string): Promise<void> {
    data = await utils.cleanResponse(data);
    this.sender(
      STATUS_CODES.SERVER_ERROR,
      message || "Request failed due to an internal error.",
      data,
      error
    );
  }
}

export default ResponseHandler;
