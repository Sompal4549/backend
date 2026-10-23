import { Router, Request, Response } from 'express';
import { EnquiryModel } from '../models/enquiry.model';
import ApplicationModel from '../models/applicationModel';
import { LeadModel } from '../models/lead.model';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';

export const notificationRouter = Router();

// GET /api/v1/notifications/admin
notificationRouter.get(
  '/admin',
  asyncHandler(async (_req: Request, res: Response) => {
    const [enquiries, applications, leads] = await Promise.all([
      EnquiryModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      ApplicationModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      LeadModel.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const notifications: Array<{
      _id: string;
      type: string;
      title: string;
      message: string;
      link?: string;
      isRead: boolean;
      createdAt: string;
    }> = [];

    let unreadCount = 0;

    for (const e of enquiries) {
      const isRead = Boolean(e.isRead);
      if (!isRead) unreadCount++;
      notifications.push({
        _id: String(e._id),
        type: 'ENQUIRY',
        title: 'New Enquiry',
        message: `${e.fullName || 'Prospective Client'} - ${e.projectType || 'General Enquiry'} (${e.city || 'India'})`,
        link: '/general-enquiries',
        isRead,
        createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt || new Date().toISOString()),
      });
    }

    for (const a of applications) {
      notifications.push({
        _id: String(a._id),
        type: 'CASE',
        title: 'Career Application',
        message: `${(a as any).fullName || 'Candidate'} applied for ${(a as any).position || 'Job Opening'}`,
        link: '/career-applications',
        isRead: true,
        createdAt: (a as any).createdAt instanceof Date ? (a as any).createdAt.toISOString() : String((a as any).createdAt || new Date().toISOString()),
      });
    }

    for (const l of leads) {
      notifications.push({
        _id: String(l._id),
        type: 'VOLUNTEER',
        title: 'New Lead',
        message: `${l.firstName || ''} ${l.lastName || ''} registered on website`,
        link: '/leads',
        isRead: true,
        createdAt: (l as any).createdAt instanceof Date ? (l as any).createdAt.toISOString() : String((l as any).createdAt || new Date().toISOString()),
      });
    }

    // Sort all notifications chronologically
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    successResponse(
      res,
      {
        notifications: notifications.slice(0, 15),
        unreadCount,
      },
      'Admin notifications retrieved'
    );
  })
);

// PATCH /api/v1/notifications/admin/:id/read
notificationRouter.patch(
  '/admin/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await EnquiryModel.findByIdAndUpdate(id, { isRead: true });
    successResponse(res, { success: true }, 'Notification marked as read');
  })
);

// PATCH /api/v1/notifications/admin/read-all
notificationRouter.patch(
  '/admin/read-all',
  asyncHandler(async (_req: Request, res: Response) => {
    await EnquiryModel.updateMany({ isRead: false }, { isRead: true });
    successResponse(res, { success: true }, 'All notifications marked as read');
  })
);
