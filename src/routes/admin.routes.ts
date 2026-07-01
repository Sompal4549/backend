import { Router } from 'express';
import { adminLogin, adminLoginDev, adminLogout, getDashboard, getUsers, getAllOrders, updateOrder, createUserByAdmin, changeUserRole, getEnquiries, updateEnquiry, updateUserByAdmin, deleteUserByAdmin } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { superAdminMiddleware } from '../middlewares/superadmin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { createReview } from '../controllers/review.controller';

export const adminRouter = Router();

adminRouter.post(
  '/login',
  [
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required'),
    body('otp').notEmpty().withMessage('OTP is required')
  ],
  validateRequest,
  adminLogin
);

// Development endpoint - no OTP required
adminRouter.post(
  '/login/dev',
  [
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required')
  ],
  validateRequest,
  adminLoginDev
);

adminRouter.post('/logout', adminLogout);

adminRouter.use(authMiddleware, adminMiddleware);

// Admin and SuperAdmin can add reviews for products
adminRouter.post(
  '/reviews/:productId',
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').notEmpty().withMessage('Comment is required')
  ],
  validateRequest,
  createReview
);

adminRouter.get('/dashboard', getDashboard);

adminRouter.get('/users', getUsers);

adminRouter.get('/enquiries', getEnquiries);

adminRouter.put(
  '/enquiries/:id',
  [
    param('id').isMongoId().withMessage('Valid enquiry ID is required'),
    body('status').isIn(['pending', 'contacted', 'resolved', 'cancelled', 'closed']).withMessage('Invalid status')
  ],
  validateRequest,
  updateEnquiry
);

/**
 * SuperAdmin Only: Change any user's role
 * NOTE: Must be BEFORE /users/:id — otherwise Express treats 'role' as :id → isMongoId() fails → 400
 */
adminRouter.put(
  '/users/role',
  superAdminMiddleware,
  [
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('role').notEmpty().withMessage('Role is required'),
  ],
  validateRequest,
  changeUserRole
);

adminRouter.put(
  '/users/:id',
  superAdminMiddleware,
  [
    param('id').isMongoId(),
  ],
  validateRequest,
  updateUserByAdmin
);

adminRouter.delete(
  '/users/:id',
  superAdminMiddleware,
  [
    param('id').isMongoId(),
  ],
  validateRequest,
  deleteUserByAdmin
);

adminRouter.get('/orders', getAllOrders);

/**
 * SuperAdmin Only: Add new user and assign role
 */
adminRouter.post(
  '/users',
  superAdminMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required'),
    body('role').notEmpty().withMessage('Role is required'),
  ],
  validateRequest,
  createUserByAdmin
);

adminRouter.put(
  '/orders/:id',
  [
    param('id').isMongoId().withMessage('Valid order id is required'),
    body('orderStatus')
      .optional()
      .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']).withMessage('Invalid payment status'),
    body().custom((value) => {
      const allowed = ['orderStatus', 'paymentStatus'];
      return Object.keys(value).every((key) => allowed.includes(key));
    }).withMessage('Only orderStatus and paymentStatus can be updated'),
  ],
  validateRequest,
  updateOrder
);
