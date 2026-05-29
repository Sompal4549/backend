import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/app.config.js';
import { authRouter } from './routes/auth.routes.js';
import { productRouter } from './routes/product.routes.js';
import { wishlistRouter } from './routes/wishlist.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { cartRouter } from './routes/cart.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { categoryRouter } from './routes/category.routes.js';
import { componentContentRouter } from './routes/component-content.routes.js';
import { navigationRouter } from './routes/navigation.routes.js';
import { footerRouter } from './routes/footer.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { otpRouter } from './routes/otpRoutes.js';
import { verifyRouter } from './routes/verify.js';
import { paymentRouter } from './routes/payment.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { swaggerDocument } from './config/swagger.config.js';
import swaggerUi from 'swagger-ui-express';

export const createApp = () => {
  const app = express();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware to automatically map local frontend numeric product IDs (like "2") to valid MongoDB ObjectIds
  app.use((req, _res, next) => {
    const mapToObjectId = (id: any): any => {
      if (typeof id === 'string') {
        const trimmed = id.trim();
        if (/^\d+$/.test(trimmed)) {
          return '600000000000000000000000'.substring(0, 24 - trimmed.length) + trimmed;
        }
      }
      return id;
    };

    if (req.url) {
      req.url = req.url.replace(/\/(\d+)(\/|\?|$)/g, (_, idStr, suffix) => {
        const pad = '600000000000000000000000';
        const resolved = pad.substring(0, 24 - idStr.length) + idStr;
        return `/${resolved}${suffix}`;
      });
    }

    if (req.body) {
      if (req.body.productId) req.body.productId = mapToObjectId(req.body.productId);
      if (req.body.id) req.body.id = mapToObjectId(req.body.id);
      if (req.body.orderId) req.body.orderId = mapToObjectId(req.body.orderId);
      if (Array.isArray(req.body.items)) {
        req.body.items.forEach((item: any) => {
          if (item && item.product) {
            item.product = mapToObjectId(item.product.toString());
          }
        });
      }
    }

    next();
  });

  app.use(morgan('tiny'));
  app.use(limiter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/uploads', express.static(path.resolve(process.cwd(), config.uploadDir)));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/component-content', componentContentRouter);
  app.use('/api/v1/navigation', navigationRouter);
  app.use('/api/v1/footer', footerRouter);
  app.use('/api/v1/uploads', uploadRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/reviews', reviewRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/media', mediaRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/otp', otpRouter);
  app.use('/api/verify', verifyRouter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
