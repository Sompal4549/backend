import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/app.config';

export const optimizeImage = async (buffer: Buffer, filename: string, subDir: string = ''): Promise<string> => {
  const safeName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const outputName = `${Date.now()}-${safeName || 'upload'}.webp`;
  const folderPath = path.join(config.uploadDir, subDir);
  const outputPath = path.resolve(process.cwd(), folderPath, outputName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(buffer)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(outputPath);
  return subDir ? `${subDir}/${outputName}` : outputName;
};

export const deleteImage = async (filename: string): Promise<void> => {
  const target = path.resolve(process.cwd(), config.uploadDir, filename);
  try {
    await fs.unlink(target);
  } catch {
    // ignore missing files
  }
};
