/**
 * The website reads a page's SEO as canonical / ogJson / schema, while the admin edits the same
 * things as canonicalUrl / openGraphTags / schemaMarkup. Saving from the admin used to replace the whole
 * `seo` object with the admin's names only, which silently dropped the website's canonical, Open Graph and
 * schema. This keeps both spellings in step and never drops a field the admin did not send.
 */
const MIRRORED_FIELDS: ReadonlyArray<readonly [adminKey: string, siteKey: string]> = [
  ['canonicalUrl', 'canonical'],
  ['openGraphTags', 'ogJson'],
  ['schemaMarkup', 'schema'],
];

export const mergePageSeo = (
  existing: Record<string, unknown> | undefined | null,
  incoming: unknown
): Record<string, unknown> => {
  const base = existing && typeof existing === 'object' ? existing : {};
  if (!incoming || typeof incoming !== 'object') return { ...base };

  const sent = incoming as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base, ...sent };
  for (const [adminKey, siteKey] of MIRRORED_FIELDS) {
    if (sent[adminKey] !== undefined) merged[siteKey] = sent[adminKey];
    else if (sent[siteKey] !== undefined) merged[adminKey] = sent[siteKey];
  }
  return merged;
};
