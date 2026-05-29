import { Response } from 'express';

export const successResponse = <T>(res: Response, data: T, _message = 'Success', status = 200) => {
  return res.status(status).json({
    status: 'success',
    data,
  });
};

export const errorResponse = (res: Response, message = 'Error', status = 500, _errors: unknown = null) => {
  return res.status(status).json({
    status: 'error',
    message,
  });
};
