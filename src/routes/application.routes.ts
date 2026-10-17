import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
} from "../controllers/application.controller";



import { resumeUpload } from '../middlewares/upload.middleware';
import { errorResponse } from '../utils/api-response';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const applicationRouter = Router();


applicationRouter.post(
  '/',
  (req, res, next) => {
    resumeUpload.single('resume')(req, res, (error) => {
      if (!error) { next(); return; }
      const message = error instanceof multer.MulterError ? error.message : (error as Error).message;
      errorResponse(res, message, 400);
    });
  },
  createApplication
);
// Reading and managing applications is for the admin only (candidates' personal data)
applicationRouter.get("/", authMiddleware, adminMiddleware, getApplications);

applicationRouter.get("/:id", authMiddleware, adminMiddleware, getApplication);

applicationRouter.put("/:id", authMiddleware, adminMiddleware, updateApplication);

applicationRouter.delete("/:id", authMiddleware, adminMiddleware, deleteApplication);
