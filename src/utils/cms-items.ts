/**
 * Admin CMS sections carry one generic `items` list ({ title, description, specs?, image? }).
 * Storefront components read the same list under different names and shapes — e.g. turnkey
 * cards need `details: string[]` and an image. This maps the admin items onto every alias
 * without breaking those shapes: fields the admin doesn't edit (images, details, ids) are
 * kept from the existing entry at the same position, and `details` is always an array.
 */
export const ITEM_ALIASES = ['items', 'ourCoreValues', 'stats', 'features', 'cards'] as const;

const IMAGE_FIELDS = ['image', 'imageurl', 'bgImage', 'backgroundImage'] as const;

/**
 * Keeps each image field in the shape the section's existing data uses: a URL string stays a
 * string, an { imageUrl, alt } object stays an object. Fields not in the existing data are left
 * as built.
 */
export const preserveImageShapes = (merged: Record<string, any>, base: Record<string, any> = {}): void => {
  for (const field of IMAGE_FIELDS) {
    const value = merged[field];
    const previous = base[field];
    if (value === undefined || previous === undefined) continue;
    if (typeof previous === 'string' && value && typeof value === 'object') {
      merged[field] = value.imageUrl ?? previous;
    } else if (previous && typeof previous === 'object' && typeof value === 'string') {
      merged[field] = { ...previous, imageUrl: value };
    }
  }
};

const toDetails = (item: Record<string, any>, previous?: Record<string, any>): string[] => {
  if (Array.isArray(item.details)) return item.details;
  if (Array.isArray(item.specs) && item.specs.length) return item.specs.map(String);
  if (Array.isArray(previous?.details) && !item.description) return previous!.details;
  if (typeof item.description === 'string' && item.description.trim()) return [item.description];
  return Array.isArray(previous?.details) ? previous!.details : [];
};

export const mapItemsToAliases = (
  items: unknown,
  base: Record<string, any> = {},
  itemsField?: string
): Record<string, any[]> => {
  if (!Array.isArray(items)) return {};

  // A section that names its list (e.g. features) only updates that list, so other lists
  // in the same section (e.g. stats) are kept as they are
  const aliases: readonly string[] =
    itemsField && itemsField !== 'items' ? ['items', itemsField] : itemsField === 'items' ? ['items'] : ITEM_ALIASES;

  const result: Record<string, any[]> = {};
  for (const alias of aliases) {
    const previousList: any[] = Array.isArray(base[alias]) ? base[alias] : [];
    // A list of plain strings stays a list of strings
    const stringList = previousList.length > 0 && previousList.every((entry) => typeof entry === 'string');
    result[alias] = items.map((raw, i) => {
      if (stringList) {
        if (typeof raw === 'string') return raw;
        const entry = (raw || {}) as Record<string, any>;
        return String(entry.title ?? entry.label ?? entry.description ?? '');
      }
      const item = raw && typeof raw === 'object' ? (raw as Record<string, any>) : { title: String(raw ?? '') };
      const previous = previousList[i] && typeof previousList[i] === 'object' ? previousList[i] : {};
      const merged: Record<string, any> = { ...previous, ...item, details: toDetails(item, previous) };
      // Keep an existing image when the admin item has none
      if (!item.image && previous.image) merged.image = previous.image;
      return merged;
    });
  }
  return result;
};
