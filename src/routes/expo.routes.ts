import { Router } from 'express';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listStalls,
  createStall,
  createStallsBulk,
  updateStall,
  deleteStall,
  listRates,
  upsertRate,
  deleteRate,
} from '../controllers/expo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const admin = [authMiddleware, adminMiddleware];

// Mounted at /events
export const eventsRouter = Router();
eventsRouter.get('/admin', ...admin, listEvents);
eventsRouter.post('/admin', ...admin, createEvent);
eventsRouter.patch('/admin/:id', ...admin, updateEvent);
eventsRouter.delete('/admin/:id', ...admin, deleteEvent);

// Mounted at /stalls
export const stallsRouter = Router();
stallsRouter.get('/admin', ...admin, listStalls);
stallsRouter.post('/admin/bulk', ...admin, createStallsBulk);
stallsRouter.post('/admin', ...admin, createStall);
stallsRouter.patch('/admin/:id', ...admin, updateStall);
stallsRouter.delete('/admin/:id', ...admin, deleteStall);

// Mounted at /stall-rates
export const stallRatesRouter = Router();
stallRatesRouter.get('/admin', ...admin, listRates);
stallRatesRouter.put('/admin', ...admin, upsertRate);
stallRatesRouter.delete('/admin/:id', ...admin, deleteRate);
