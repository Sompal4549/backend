import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/app-error";

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = err?.statusCode || 500;
  let message = err?.message || "Internal server error";
  let errors: string[] = Array.isArray(err?.errors) ? err.errors : [];

  // ApiError / AppError — known, operational errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors.length > 0 ? err.errors : [err.message];
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err instanceof mongoose.Error.CastError || err?.name === "CastError") {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.path}`;
    errors = [message];
  }

  // Mongoose Validation Error
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((el: any) => el.message);
  }

  // Duplicate Key Error (E11000)
  if (err?.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value entered for '${field}'. Please use another value.`;
    errors = [message];
  }

  // JWT Errors
  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token. Please log in again.";
    errors = [message];
  }

  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired. Please refresh your session.";
    errors = [message];
  }

  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: errors.length > 0 ? errors : [message],
    timestamp: new Date().toISOString(),
  });
};
