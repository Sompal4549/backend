import { Router, Request, Response } from 'express';
import { FeedbackModel } from '../models/feedback.model';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export const feedbackRouter = Router();

// GET /api/v1/feedback/admin
feedbackRouter.get(
  '/admin',
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await FeedbackModel.find().sort({ createdAt: -1 }).lean();
    successResponse(
      res,
      {
        items,
        total: items.length,
      },
      'Feedback fetched successfully'
    );
  })
);

// PUT /api/v1/feedback/admin/:id
feedbackRouter.put(
  '/admin/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const item = await FeedbackModel.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) throw new AppError(404, 'Feedback item not found');
    successResponse(res, item, 'Feedback status updated');
  })
);

// DELETE /api/v1/feedback/admin/:id
feedbackRouter.delete(
  '/admin/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const item = await FeedbackModel.findByIdAndDelete(req.params.id);
    if (!item) throw new AppError(404, 'Feedback item not found');
    successResponse(res, { deleted: true }, 'Feedback deleted');
  })
);

// POST /api/v1/feedback
feedbackRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const item = await FeedbackModel.create(req.body);
    successResponse(res, item, 'Thank you! Your feedback has been received.', 201);
  })
);
