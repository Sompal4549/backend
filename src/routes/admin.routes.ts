import { Router } from 'express';
import { adminLogin, adminLogout, getDashboard, getUsers, updateOrder } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const adminRouter = Router();

adminRouter.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email is required'), body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  adminLogin
);
adminRouter.post('/logout', adminLogout);

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/dashboard', getDashboard);

adminRouter.get('/users', getUsers);
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
