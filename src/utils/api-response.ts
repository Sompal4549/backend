import { Response } from "express";

export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export class ApiResponse<T = any> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T;
  public readonly timestamp: string;

  constructor(statusCode: number, data: T, message = "Success") {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  send(res: Response): Response {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    });
  }

  static ok<T>(data: T, message = "Success"): ApiResponse<T> {
    return new ApiResponse(200, data, message);
  }

  static created<T>(data: T, message = "Created"): ApiResponse<T> {
    return new ApiResponse(201, data, message);
  }
}

// Backward compatibility helper functions:
export const successResponse = <T>(res: Response, data: T, message = "Success", statusCode = 200) => {
  return new ApiResponse(statusCode, data, message).send(res);
};

export const errorResponse = (res: Response, message = "Error", statusCode = 500, errors: string[] = []) => {
  const list = Array.isArray(errors) && errors.length > 0 ? errors : [message];
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: list,
    timestamp: new Date().toISOString(),
  });
};
