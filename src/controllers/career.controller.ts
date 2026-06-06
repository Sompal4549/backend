import { Request, Response } from 'express';
import { CareerModel } from '../models/career.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { successResponse, errorResponse } from '../utils/api-response';

export const getCareers = async (req: Request, res: Response): Promise<void> => {
  try {
    const careers = await CareerModel.find().sort({ createdAt: -1 }).lean();
    successResponse(res, careers, 'Careers retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const createCareer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Creating career with data:', req.body);
    const career = await CareerModel.create(req.body);
    console.log('Career created successfully:', career._id);
    successResponse(res, career, 'Career created', 201);
  } catch (error) {
    console.error('Error creating career:', error);
    errorResponse(res, (error as Error).message, 400);
  }
};

export const updateCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const career = await CareerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!career) {
      errorResponse(res, 'Career not found', 404);
      return;
    }
    successResponse(res, career, 'Career updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const deleteCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const career = await CareerModel.findByIdAndDelete(req.params.id);
    if (!career) {
      errorResponse(res, 'Career not found', 404);
      return;
    }
    successResponse(res, null, 'Career deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};