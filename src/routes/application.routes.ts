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
applicationRouter.get("/", getApplications);

applicationRouter.get("/:id", getApplication);

applicationRouter.put("/:id", updateApplication);

applicationRouter.delete("/:id", deleteApplication);
