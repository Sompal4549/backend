/**
 * Escapes regex special characters in a user-supplied string to prevent ReDoS or unintended matching.
 */
export const escapeRegex = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
