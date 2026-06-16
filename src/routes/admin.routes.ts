import { Router } from 'express';
import { adminLogin, adminLogout, getDashboard, getUsers, getAllOrders, updateOrder, createUserByAdmin, changeUserRole } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { superAdminMiddleware } from '../middlewares/superadmin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

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
adminRouter.post('/logout', adminLogout);

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/dashboard', getDashboard);

adminRouter.get('/users', getUsers);

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

/**
 * SuperAdmin Only: Change any user's role
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
