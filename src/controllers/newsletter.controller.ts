import { Request, Response } from 'express';
import { subscribeUser, getSubscribers, sendBlogToEmails } from '../services/newsletter.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export const handleSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { email, type } = req.body;
  if (!email) {
    throw new AppError(400, 'Email is required');
  }

  const validType: 'blog' | 'career' | 'product' =
    type === 'career' || type === 'product' ? type : 'blog';
  const subscriber = await subscribeUser(email, validType);
  successResponse(res, subscriber, 'Successfully subscribed to newsletter!');
});

export const listSubscribers = asyncHandler(async (_req: Request, res: Response) => {
  const subscribers = await getSubscribers();
  successResponse(res, subscribers, 'Subscribers retrieved successfully');
});

export const sendBlogMails = asyncHandler(async (req: Request, res: Response) => {
  const { blogId, emails } = req.body;
  if (!blogId || !Array.isArray(emails) || emails.length === 0) {
    throw new AppError(400, 'blogId and a non-empty emails array are required');
  }

  await sendBlogToEmails(blogId, emails);
  successResponse(res, null, `Blog link sent to ${emails.length} users successfully`);
});
