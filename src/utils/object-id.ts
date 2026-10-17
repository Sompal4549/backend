/**
 * True only for a 24-character hex ObjectId string.
 * mongoose.isValidObjectId() also accepts ANY 12-character string (12 raw bytes), so keys
 * like "productsPage" or a 12-letter blog slug were wrongly treated as _id lookups.
 */
export const isObjectIdString = (value: unknown): boolean =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
