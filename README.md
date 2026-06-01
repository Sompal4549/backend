# Ensis Backend

A production-ready ecommerce backend built with Node.js, Express, MongoDB, Mongoose, JWT, and TypeScript.

## Features
- User authentication with access and refresh tokens
- Admin authentication with role-separated login and protected admin routes
- Email and WhatsApp OTP request/verification with expiry and retry limits
- Role-based authorization (`user`, `admin`)
- Product, wishlist, cart, order, review, address, and media management
- Image upload and WebP optimization using Sharp
- Global error handling and reusable middleware
- Validation with `express-validator`
- Rate limiting, Helmet, CORS, and secure cookies
- Swagger API documentation
- Seeder script and Postman example collection

## Folder structure
- `src` - TypeScript source of truth for development
- `dist` - generated JavaScript build output created by `npm run build`; do not edit it directly
- `src/config` - environment and app configuration
- `src/controllers` - request handlers
- `src/services` - business logic
- `src/repositories` - database access
- `src/models` - Mongoose schemas
- `src/routes` - REST API routes
- `src/middlewares` - reusable middleware
- `src/validators` - request validation rules
- `src/utils` - helpers, response formatters, pagination
- `src/docs` - Swagger documentation
- `src/seeds` - sample seed data
- `src/uploads` - optimized media storage
- `src/helpers` - shared utilities
- `src/jobs` - future cron/task jobs
- `src/socket` - socket server (stub)

## Setup
1. Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Build production code:
   ```bash
   npm run build
   npm start
   ```

On Windows PowerShell, if `npm run ...` is blocked by execution policy, run the same command through `npm.cmd`, for example `npm.cmd run dev`.

## Environment variables
- `PORT`
- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES`
- `REFRESH_TOKEN_EXPIRES`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `CORS_ORIGIN`
- `NODE_ENV`
- `UPLOAD_DIR`
- `UPLOAD_MAX_FILE_SIZE_BYTES`
- `UPLOAD_MAX_FILES`
- `UPLOAD_ALLOWED_MIME_TYPES`
- `OTP_LENGTH`
- `OTP_EXPIRES_MINUTES`
- `OTP_MAX_VERIFY_ATTEMPTS`
- `OTP_RESEND_LIMIT`
- `OTP_RESEND_WINDOW_MINUTES`
- `EMAIL_PROVIDER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_KEY`
- `WHATSAPP_SENDER`

## API Endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/email-otp/send`
- `POST /api/v1/auth/email-otp/verify`
- `POST /api/v1/auth/whatsapp-otp/send`
- `POST /api/v1/auth/whatsapp-otp/verify`
- `POST /api/v1/admin/login`
- `POST /api/v1/admin/logout`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PUT /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `POST /api/v1/wishlist/:productId`
- `DELETE /api/v1/wishlist/:productId`
- `GET /api/v1/wishlist`
- `POST /api/v1/reviews/:productId`
- `PUT /api/v1/reviews/:id`
- `DELETE /api/v1/reviews/:id`
- `POST /api/v1/orders`
- `GET /api/v1/orders/my-orders`
- `GET /api/v1/orders/:id`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/orders/:id`
- `POST /api/v1/media`
- `DELETE /api/v1/media/:id`

## Swagger
Visit `/api-docs` after starting the server.

## Health Check
```http
GET http://localhost:4000/health
```

## Common Route Examples
```http
POST http://localhost:4000/api/v1/auth/login
GET http://localhost:4000/api/v1/products
GET http://localhost:4000/api/v1/products/:id
GET http://localhost:4000/api/v1/admin/dashboard
```

Protected routes require:
```http
Authorization: Bearer <accessToken>
```

## Docker
- `docker-compose up --build`

## JWT Flow
1. User logs in and receives an access token plus a refresh token.
2. Access tokens expire quickly; refresh tokens are used to issue new access tokens.
3. Refresh tokens are stored in cookies and validated by middleware.
4. Roles are checked by authorization middleware.

## Image Upload Flow
- Uploads use Multer memory storage.
- Sharp converts JPG/PNG images to optimized WebP files.
- Files are saved with unique names under `src/uploads`.
- The API returns optimized image URLs.
- Uploads require a valid bearer access token. Deleting uploaded media requires an admin token.
- File size, count, and MIME types are configured through environment variables.

## OTP Flow
1. Request an OTP through the email or WhatsApp send endpoint.
2. The server stores only a hashed OTP with an expiry timestamp and attempt counters.
3. Verification rejects expired, reused, incorrect, or over-attempted OTPs.
4. Successful email verification sets `emailVerified=true` on a matching user.
5. Successful WhatsApp verification sets `phoneVerified=true` on a matching user.

Local development can use `EMAIL_PROVIDER=console` and `WHATSAPP_PROVIDER=console`; production should provide SMTP and WhatsApp HTTP provider credentials in `.env`.

## Admin Authorization
- `authMiddleware` verifies tokens and user identity.
- `adminMiddleware` checks `req.user.role === 'admin'`.
- Admin routes are protected separately from user routes.
- Admins sign in through `POST /api/v1/admin/login`; regular users sign in through `POST /api/v1/auth/login`.

## Manual Verification
- Register a user with `POST /api/v1/auth/register`, then login with `POST /api/v1/auth/login` and confirm an access token is returned while the refresh token is set as an HTTP-only cookie.
- Login as an admin with `POST /api/v1/admin/login`; confirm a normal user receives `403 Admin access required`.
- Call `POST /api/v1/auth/logout` or `POST /api/v1/admin/logout`; confirm the refresh cookie is cleared and refresh no longer succeeds.
- With console providers, request email and WhatsApp OTPs, copy the logged code, verify it, then confirm incorrect and expired codes are rejected.
- Upload an allowed image with `POST /api/v1/media` and `Authorization: Bearer <accessToken>`; confirm the response includes `url`, `filename`, `mimetype`, `size`, and `uploadedBy`.
- Try an unsupported file type or an oversized file and confirm the API returns a validation error.

## Scalable Architecture
- Controllers, services, and repositories are separated.
- Configuration and utilities are centralized.
- Middleware is reusable and composable.
- Models are normalized and referenced.

## Postman
A Postman collection is available at `src/docs/postman-ecommerce-collection.json`.
