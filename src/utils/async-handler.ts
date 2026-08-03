import { NextFunction, Request, Response } from 'express';

type AsyncHandler<Req extends Request, Res extends Response> = (
  req: Req,
  res: Res,
  next: NextFunction
) => void;

export const asyncHandler = <Req extends Request = Request, Res extends Response = Response>(
  fn: (req: Req, res: Res) => Promise<unknown>
): AsyncHandler<Req, Res> => (req, res, next) => {
  Promise.resolve(fn(req, res)).catch(next);
};
