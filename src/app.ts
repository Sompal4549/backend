import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { config } from './config/app.config';
import './plugins/activity-log.plugin';
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
import { enquiryRouter } from './routes/enquiry.routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { swaggerDocument } from './config/swagger.config';
import swaggerUi from 'swagger-ui-express';
import seoRoutes from "./routes/seo.routes";
import { socialRouter } from './routes/sociallink.routes';
import { applicationRouter } from './routes/application.routes';
import { activityLogRouter } from './routes/activity-log.routes';
import { leadRouter } from './routes/lead.routes';
import { dashboardRouter, enquiryListRouter } from './routes/dashboard.routes';
import { solutionRouter } from './routes/solution.routes';
import { invoiceRouter } from './routes/invoice.routes';
import { chatbotRouter } from './routes/chatbot.routes';
import { verifyRouter } from './routes/verify';
import { verifyImageRouter } from './routes/verify-image.routes';
import { adminChatsRouter } from './routes/admin-chats.routes';
import { otpRouter } from './routes/otpRoutes';
import { analyticsRouter } from './routes/analytics.routes';
import { dropdownsRouter } from './routes/dropdowns.routes';
import { settingsRouter } from './routes/settings.routes';
import { chatbotManagerRouter } from './routes/chatbot-manager.routes';
import { faqRouter } from './routes/faq.routes';
import { lazyInfraRouter } from './modules/infrastructure/infra.permissions';

export const createApp = () => {
  const app = express();

  // Behind Nginx / proxy — use the visitor's IP (X-Forwarded-For)
  app.set('trust proxy', 1);

  // HTTP request logging
  app.use(morgan('tiny'));

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.env === 'development' ? 100000 : 10000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const ip = req.ip || '';
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    },
  });
  app.use(limiter);

  // Login, password reset and OTP endpoints get a much tighter per-IP budget to stop
  // OTP / password brute-forcing (refresh-token, /me and logout are not counted)
  const SENSITIVE_AUTH_PATH =
    /^\/api(\/v1)?\/(auth\/(login|register|verify-2fa|forgot-password|reset-password|email-otp|whatsapp-otp|send-|verify-)|admin\/(login|forgot-password|reset-password|verify-2fa)|otp\/|verify\/)/;
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.env === 'development' ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again after some time.' },
    skip: (req) => {
      const ip = req.ip || '';
      const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      return isLocal || !SENSITIVE_AUTH_PATH.test(req.path);
    },
  });
  app.use(authLimiter);

  // ─── Security Headers ───────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // ─── CORS — only the Ensis website and admin (plus localhost while developing) ─
  // Requests without an Origin (server-side fetches, curl, webhooks) are not CORS requests.
  const allowedOrigins = new Set(config.corsOrigin);
  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)*ensis\.in$/i.test(origin)) return true;
    return !config.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  };

  // Explicit preflight handler first: echoes the requested headers so that
  // Authorization / x-admin-page survive credentialed preflights.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin && isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      // Without the headers the browser blocks the real request from an unknown site
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  app.use(compression());

  // Infrastructure collector pushes are mounted before the global 50 MB parser: they carry their own 256 KB cap
  app.use(
    ['/api/v1/infrastructure/ingest', '/api/infrastructure/ingest'],
    lazyInfraRouter(() => import('./modules/infrastructure/infra.ingest.routes'), 'infraIngestRouter')
  );

  // ─── Body Parsers / Cookies ─────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        // Capture raw body for signature verification in webhooks
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static files and docs early to bypass logic middleware and prevent path mangling
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // ─── Static Uploads ─────────────────────────────────────────────────────────
  const allowCrossOrigin = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  };
  app.use('/uploads', allowCrossOrigin, express.static(path.join(process.cwd(), 'uploads')));
  app.use('/uploads', allowCrossOrigin, express.static(path.join(process.cwd(), 'src', 'uploads')));

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

  // ─── NoSQL Injection Sanitizer ──────────────────────────────────────────────
  // Strips MongoDB operator keys ($gt, $ne, ...) from body, query and params
  app.use((req, _res, next) => {
    const clean = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(clean);
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          obj[key] = clean(obj[key]);
        }
      }
      return obj;
    };
    if (req.body) clean(req.body);
    if (req.query) clean(req.query);
    if (req.params) clean(req.params);
    next();
  });

  // ─── Admin Activity Page Tracker ────────────────────────────────────────────
  // Captures the admin panel page (x-admin-page) and menu (x-admin-module)
  app.use((req, _res, next) => {
    const headers = req.headers;
    (req as any).adminPage = headers['x-admin-page'] || null;
    (req as any).adminModule = headers['x-admin-module'] || null;
    next();
  });

  // ─── Routes (mounted on both /api and /api/v1) ──────────────────────────────
  const mountRoute = (routePath: string, router: express.Router | express.RequestHandler) => {
    app.use(`/api/v1${routePath}`, router);
    app.use(`/api${routePath}`, router);
  };

  mountRoute('/auth', authRouter);
  mountRoute('/products', productRouter);
  mountRoute('/categories', categoryRouter);
  mountRoute('/component-content', componentContentRouter);
  mountRoute('/navigation', navigationRouter);
  mountRoute('/footer', footerRouter);
  mountRoute('/uploads', uploadRouter);
  mountRoute('/wishlist', wishlistRouter);
  mountRoute('/reviews', reviewRouter);
  mountRoute('/orders', orderRouter);
  mountRoute('/payments', paymentRouter);
  mountRoute('/blogs', blogRouter);
  mountRoute('/newsletter', newsletterRouter);
  mountRoute('/cart', cartRouter);
  mountRoute('/profile', profileRouter);
  mountRoute('/media', mediaRouter);
  mountRoute('/admin/chatbot', chatbotManagerRouter);
  mountRoute('/admin/chats', adminChatsRouter);
  mountRoute('/admin', adminRouter);
  mountRoute('/projects', projectRouter);
  mountRoute('/careers', careerRouter);
  mountRoute('/enquiry', enquiryRouter);
  mountRoute('/seo', seoRoutes);
  mountRoute('/pages', pageRouter);
  mountRoute('/social-clicks', socialRouter);
  mountRoute('/applications', applicationRouter);
  mountRoute('/activity-logs', activityLogRouter);
  mountRoute('/leads', leadRouter);
  mountRoute('/solutions', solutionRouter);
  mountRoute('/invoices', invoiceRouter);
  mountRoute('/dashboard', dashboardRouter);
  mountRoute('/enquiries', enquiryListRouter);
  mountRoute('/contact-enquiry', enquiryListRouter);
  mountRoute('/chatbot', chatbotRouter);
  mountRoute('/verify', verifyRouter);
  mountRoute('/verify-image', verifyImageRouter);
  mountRoute('/otp', otpRouter);
  mountRoute('/analytics', analyticsRouter);
  mountRoute('/dropdowns', dropdownsRouter);
  mountRoute('/settings', settingsRouter);
  mountRoute('/faqs', faqRouter);
  mountRoute('/infrastructure', lazyInfraRouter(() => import('./modules/infrastructure/infra.routes')));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // ─── 404 + Global Error Handler ─────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
