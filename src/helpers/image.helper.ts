import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/app.config.js';

export const optimizeImage = async (buffer: Buffer, filename: string): Promise<string> => {
  const outputName = `${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}.webp`;
  const outputPath = path.resolve(process.cwd(), config.uploadDir, outputName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(buffer).webp({ quality: 80 }).toFile(outputPath);
  return outputName;
};

export const deleteImage = async (filename: string): Promise<void> => {
  const target = path.resolve(process.cwd(), config.uploadDir, filename);
  try {
    await fs.unlink(target);
  } catch {
    // ignore missing files
  }
};
