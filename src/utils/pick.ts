/**
 * Safe object property picker to prevent mass-assignment vulnerabilities.
 * Extracts only allowed keys from the source object.
 */
export const pick = <T extends Record<string, any>, K extends string>(
  obj: T | undefined | null,
  allowedKeys: readonly K[] | K[]
): Record<string, any> => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {};
  }
  const result: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};
