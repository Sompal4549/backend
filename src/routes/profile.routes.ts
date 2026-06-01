import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const profileRouter = Router();

profileRouter.use(authMiddleware);
profileRouter.get('/', getUserProfile);
profileRouter.put(
  '/',
  [body('name').optional().notEmpty().withMessage('Name cannot be empty'), body('email').optional().isEmail().withMessage('Valid email required')],
  validateRequest,
  updateUserProfile
);
