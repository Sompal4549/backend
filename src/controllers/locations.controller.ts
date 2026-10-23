import { Request, Response } from 'express';
import { CustomCityModel } from '../models/custom-city.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { isObjectIdString } from '../utils/object-id';

/*
 * Country / State dropdowns and admin-added cities (ensis-admin lib/dropdownsApi.ts locationsApi).
 * Response shape follows the Organic Expo API the admin was built against:
 *   country { _id, name, countryCode }
 *   state   { _id, name, stateCode, isoCode, countryCode }   stateCode is ISO 3166-2, e.g. "IN-DL"
 * Only India is bundled (the full world list would need the `country-state-city` package).
 */

const COUNTRIES = [{ _id: 'IN', name: 'India', countryCode: 'IN', phoneCode: '91' }];

// ISO 3166-2:IN subdivision codes
const STATES_BY_COUNTRY: Record<string, [string, string][]> = {
  IN: [
    ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'],
    ['BR', 'Bihar'], ['CH', 'Chandigarh'], ['CT', 'Chhattisgarh'],
    ['DH', 'Dadra and Nagar Haveli and Daman and Diu'], ['DL', 'Delhi'], ['GA', 'Goa'], ['GJ', 'Gujarat'],
    ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'], ['JH', 'Jharkhand'],
    ['KA', 'Karnataka'], ['KL', 'Kerala'], ['LA', 'Ladakh'], ['LD', 'Lakshadweep'], ['MP', 'Madhya Pradesh'],
    ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'],
    ['OR', 'Odisha'], ['PY', 'Puducherry'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
    ['TN', 'Tamil Nadu'], ['TG', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'], ['UT', 'Uttarakhand'],
    ['WB', 'West Bengal'],
  ],
};

const statesOf = (countryCode: string) =>
  (STATES_BY_COUNTRY[countryCode] || [])
    .map(([isoCode, name]) => ({ _id: `${countryCode}-${isoCode}`, name, stateCode: `${countryCode}-${isoCode}`, isoCode, countryCode }))
    .sort((a, b) => a.name.localeCompare(b.name));

const countryParam = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, 'countryCode is required');
  const code = value.trim().toUpperCase();
  if (!COUNTRIES.some((c) => c.countryCode === code)) throw new AppError(404, `Unknown country "${value}"`);
  return code;
};

/** Accepts "IN-DL", or a plain "DL" together with countryCode; checks the state exists. */
const stateParam = (stateCodeRaw: unknown, countryCodeRaw: unknown) => {
  const raw = typeof stateCodeRaw === 'string' ? stateCodeRaw.trim().toUpperCase() : '';
  if (!raw) throw new AppError(400, 'stateCode is required');

  let countryCode: string;
  let isoCode: string;
  if (countryCodeRaw !== undefined) {
    countryCode = countryParam(countryCodeRaw);
    isoCode = raw.startsWith(`${countryCode}-`) ? raw.slice(countryCode.length + 1) : raw;
  } else {
    const dash = raw.indexOf('-');
    if (dash < 1) throw new AppError(400, 'stateCode must look like "IN-DL", or pass countryCode as well');
    countryCode = countryParam(raw.slice(0, dash));
    isoCode = raw.slice(dash + 1);
  }
  if (!(STATES_BY_COUNTRY[countryCode] || []).some(([code]) => code === isoCode)) {
    throw new AppError(404, `Unknown state "${raw}"`);
  }
  return { countryCode, stateCode: `${countryCode}-${isoCode}` };
};

const cityName = (value: unknown): string => {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new AppError(400, 'City name is required');
  if (name.length > 100) throw new AppError(400, 'City name must be 100 characters or fewer');
  return name;
};

const cityId = (value: unknown): string => {
  if (!isObjectIdString(value)) throw new AppError(400, 'Invalid city id');
  return String(value);
};

const rethrowDuplicate = (error: any): never => {
  if (error?.code === 11000) throw new AppError(409, 'That city has already been added for this state');
  throw error;
};

// GET /crm-countries
export const getCountries = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, COUNTRIES, 'Countries retrieved');
});

// GET /crm-states?countryCode=IN
export const getStates = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, statesOf(countryParam(req.query.countryCode)), 'States retrieved');
});

// GET /locations/admin/cities?stateCode=IN-DL (all states when omitted)
export const listCustomCities = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.stateCode !== undefined) filter.stateCode = stateParam(req.query.stateCode, req.query.countryCode).stateCode;
  const cities = await CustomCityModel.find(filter).sort({ stateCode: 1, name: 1 }).lean();
  successResponse(res, cities, 'Custom cities retrieved');
});

// POST /locations/admin/cities { stateCode: "IN-UP", name, countryCode?, isActive? }
export const createCustomCity = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const { countryCode, stateCode } = stateParam(body.stateCode, body.countryCode);
  const name = cityName(body.name);
  if (name.toLowerCase() === 'other') throw new AppError(400, '"Other" is always offered already');
  const city = await CustomCityModel.create({
    countryCode,
    stateCode,
    name,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  }).catch(rethrowDuplicate);
  successResponse(res, city, 'City added', 201);
});

// PATCH /locations/admin/cities/:id { name?, isActive? }
export const updateCustomCity = asyncHandler(async (req: Request, res: Response) => {
  const city = await CustomCityModel.findById(cityId(req.params.id));
  if (!city) throw new AppError(404, 'City not found');
  const body = req.body ?? {};
  if (body.name !== undefined) city.name = cityName(body.name);
  if (body.isActive !== undefined) city.isActive = Boolean(body.isActive);
  await city.save().catch(rethrowDuplicate);
  successResponse(res, city, 'City updated');
});

// DELETE /locations/admin/cities/:id
export const deleteCustomCity = asyncHandler(async (req: Request, res: Response) => {
  const city = await CustomCityModel.findByIdAndDelete(cityId(req.params.id));
  if (!city) throw new AppError(404, 'City not found');
  successResponse(res, null, 'City deleted');
});
