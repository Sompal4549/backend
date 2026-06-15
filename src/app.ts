import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/app.config';
import { authRouter } from './routes/auth.routes';
import { productRouter } from './routes/product.routes';
import { wishlistRouter } from './routes/wishlist.routes';
import { reviewRouter } from './routes/review.routes';
import { orderRouter } from './routes/order.routes';
import { cartRouter } from './routes/cart.routes';
import { profileRouter } from './routes/profile.routes';
import { mediaRouter } from './routes/media.routes';
import { adminRouter } from './routes/admin.routes';
import { categoryRouter } from './routes/category.routes';
import { componentContentRouter } from './routes/component-content.routes';
import { navigationRouter } from './routes/navigation.routes';
import { footerRouter } from './routes/footer.routes';
import { uploadRouter } from './routes/upload.routes';
import { paymentRouter } from './routes/payment.routes';
import { blogRouter } from './routes/blog.routes';
import { newsletterRouter } from './routes/newsletter.routes';
import { pageRouter } from './routes/page.routes';
import { projectRouter } from './routes/project.routes';
import { careerRouter } from './routes/career.routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { swaggerDocument } from './config/swagger.config';
import swaggerUi from 'swagger-ui-express';
import seoRoutes from "./routes/seo.routes";

export const createApp = () => {
  const app = express();

  app.use(morgan('tiny'));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000, // Increased limit to 10000 to prevent 429 errors during development
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.set('trust proxy', 1);
  app.use(limiter);
  app.use(helmet());

  // Parse comma-separated origins from config into an array and handle potential type narrowing issues
  const rawOrigin = config.corsOrigin as string | string[];
  const allowedOrigins = typeof rawOrigin === 'string'
    ? rawOrigin.split(',').map((origin: string) => origin.trim()).filter((origin) => origin !== '')
    : rawOrigin;

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ 
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      // Capture raw body for signature verification in webhooks
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files and docs early to bypass logic middleware and prevent path mangling
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  /**
   * Middleware to handle legacy numeric ID mapping.
   * Automatically converts short numeric IDs (e.g., "123") into padded MongoDB-compatible Hex strings.
   * This ensures consistency between a frontend using numeric IDs and a MongoDB backend.
   */
  app.use((req, _res, next) => {
    const OBJECT_ID_PAD = '600000000000000000000000';

    const mapToObjectId = (id: any): string | any => {
      if (typeof id !== 'string') return id;
      const trimmed = id.trim();
      
      // Only pad if it's purely numeric and shorter than 24 characters
      if (/^\d+$/.test(trimmed) && trimmed.length < 24) {
        return OBJECT_ID_PAD.substring(0, 24 - trimmed.length) + trimmed;
      }
      return id;
    };

    // Resolve IDs in the URL path parameters
    if (req.url) {
      req.url = req.url.replace(/\/(\d+)(\/|\?|$)/g, (_, idStr, suffix) => {
        const resolved = mapToObjectId(idStr);
        return `/${resolved}${suffix}`;
      });
    }

    // Resolve IDs in the request body for standard entity fields
    if (req.body) {
      const commonIdKeys = ['productId', 'id', 'orderId', 'categoryId', 'reviewId'];
      
      commonIdKeys.forEach(key => {
        if (req.body[key]) {
          req.body[key] = mapToObjectId(req.body[key].toString());
        }
      });

      if (Array.isArray(req.body.items)) {
        req.body.items.forEach((item: any) => {
          if (item?.product) {
            item.product = mapToObjectId(item.product.toString());
          }
        });
      }
    }

    next();
  });

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
  app.use('/api/v1/blogs', blogRouter);
  app.use('/api/v1/newsletter', newsletterRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/media', mediaRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/careers', careerRouter);
  app.use("/api/v1/seo", seoRoutes);
  app.use('/api/v1/pages', pageRouter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
