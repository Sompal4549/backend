import { Router } from 'express';
import {
  getCountries,
  getStates,
  listCustomCities,
  createCustomCity,
  updateCustomCity,
  deleteCustomCity,
} from '../controllers/locations.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

// Mounted at /locations
export const locationsRouter = Router();

locationsRouter.get('/admin/cities', authMiddleware, adminMiddleware, listCustomCities);
locationsRouter.post('/admin/cities', authMiddleware, adminMiddleware, createCustomCity);
locationsRouter.patch('/admin/cities/:id', authMiddleware, adminMiddleware, updateCustomCity);
locationsRouter.delete('/admin/cities/:id', authMiddleware, adminMiddleware, deleteCustomCity);

// Public, like the Organic Expo API (registration forms read them). Mounted at /crm-countries and /crm-states.
export const crmCountriesRouter = Router();
crmCountriesRouter.get('/', getCountries);

export const crmStatesRouter = Router();
crmStatesRouter.get('/', getStates);
