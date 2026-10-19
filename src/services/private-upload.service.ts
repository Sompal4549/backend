import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FileKind, IPrivateFile, PrivateFileModel } from '../models/private-file.model';
import { config } from '../config/app.config';
import { AppError } from '../utils/app-error';

const PRIVATE_DIR = path.resolve(process.cwd(), 'private_uploads');

// Ensure storage subdirectories exist
function ensureDirectories() {
  const dirs = [
    PRIVATE_DIR,
    path.join(PRIVATE_DIR, 'cvs'),
    path.join(PRIVATE_DIR, 'photos'),
    path.join(PRIVATE_DIR, 'documents'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
ensureDirectories();

const SIGNING_SECRET = config.jwtAccessSecret || 'ensis-private-file-secret';

export async function savePrivateFile(
  buffer: Buffer,
  originalName: string,
  kind: FileKind,
  ip?: string
): Promise<IPrivateFile> {
  ensureDirectories();
  const fileId = crypto.randomUUID();
  const ext = path.extname(originalName).toLowerCase();
  const safeBase = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);
  const storedFileName = `${fileId}_${safeBase}${ext}`;

  const subDir = kind === 'cv' ? 'cvs' : kind === 'photo' ? 'photos' : 'documents';
  const storagePath = path.join(PRIVATE_DIR, subDir, storedFileName);

  await fs.promises.writeFile(storagePath, buffer);

  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  const fileDoc = await PrivateFileModel.create({
    fileId,
    fileName: originalName,
    originalName,
    mimeType,
    size: buffer.length,
    kind,
    storagePath,
    uploadedByIp: ip,
  });

  return fileDoc;
}

export async function getPrivateFile(fileId: string): Promise<IPrivateFile> {
  const file = await PrivateFileModel.findOne({ fileId });
  if (!file) {
    throw new AppError(404, 'File not found');
  }
  return file;
}

export function generateSignedUrl(fileId: string, expiresInMinutes: number = 15): string {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  const data = `${fileId}:${expires}`;
  const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest('hex');
  return `/api/v1/careers/admin/files/${fileId}/download?expires=${expires}&sig=${signature}`;
}

export function verifySignedUrlSignature(fileId: string, expiresStr: string, sig: string): boolean {
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) {
    return false;
  }
  const data = `${fileId}:${expires}`;
  const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}
