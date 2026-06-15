import { Request, Response } from 'express';
import { subscribeUser, getSubscribers, sendBlogToEmails } from '../services/newsletter.service';
import { successResponse, errorResponse } from '../utils/api-response';

export const handleSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      errorResponse(res, 'Email is required', 400);
      return;
    }

    const subscriber = await subscribeUser(email);
    successResponse(res, subscriber, 'Successfully subscribed to newsletter!');
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const listSubscribers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await getSubscribers();
    successResponse(res, subscribers, 'Subscribers retrieved successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const sendBlogMails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blogId, emails } = req.body;
    if (!blogId || !Array.isArray(emails) || emails.length === 0) {
      errorResponse(res, 'blogId and a non-empty emails array are required', 400);
      return;
    }

    await sendBlogToEmails(blogId, emails);
    successResponse(res, null, `Blog link sent to ${emails.length} users successfully`);
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};