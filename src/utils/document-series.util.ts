/**
 * Utility for generating standardized document numbering series across Ensis CRM.
 * Formula requested by user:
 * ENS | (dynamic: 2 words -> 1st letter of word 1 + 1st letter of word 2; 1 word -> 1st 2 letters) | 26-27 (Financial Year) | Number of document created
 *
 * Examples:
 * - 'purchase order' -> 'PO' -> ENS|PO|26-27|0001
 * - 'invoice'        -> 'IN' -> ENS|IN|26-27|0001
 * - 'job order'      -> 'JO' -> ENS|JO|26-27|0001
 * - 'estimate'       -> 'ES' -> ENS|ES|26-27|0001
 * - 'sales order'    -> 'SO' -> ENS|SO|26-27|0001
 */

export function getDocumentPrefix(docType: string): string {
  const words = docType.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return 'DOC';
}

/**
 * Computes Indian Financial Year (Apr 1 - Mar 31).
 * For date in Nov 2026 -> '26-27'.
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1 to 12
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

export interface DocumentSeriesOptions {
  delimiter?: string;
  padding?: number;
  date?: Date;
  companyPrefix?: string;
}

export function generateDocumentNumber(
  docType: string,
  sequenceNumber: number,
  options: DocumentSeriesOptions = {}
): string {
  const {
    delimiter = '|',
    padding = 4,
    date = new Date(),
    companyPrefix = 'ENS',
  } = options;

  const prefix = getDocumentPrefix(docType);
  const fy = getFinancialYear(date);
  const seq = String(sequenceNumber).padStart(padding, '0');

  return [companyPrefix, prefix, fy, seq].join(delimiter);
}
