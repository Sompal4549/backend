declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(options: { buffer: Buffer } | { path: string }): Promise<RawTextResult>;
  export function convertToHtml(options: { buffer: Buffer } | { path: string }): Promise<{ value: string; messages: any[] }>;
}
