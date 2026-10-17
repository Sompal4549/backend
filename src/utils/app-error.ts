export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: string[];
  public readonly timestamp: string;

  constructor(statusCode: number, message: string, errors: string[] = [], isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  // Common error helpers (Organic blueprint)
  static badRequest(message: string, errors: string[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Not Found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string, errors: string[] = []): ApiError {
    return new ApiError(409, message, errors);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = "Internal Server Error"): ApiError {
    return new ApiError(500, message, [], false);
  }
}

// Alias for existing codebase compatibility
export const AppError = ApiError;
