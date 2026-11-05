import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { config } from '../config/app.config';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export const hasCloudinaryConfig = (): boolean => {
  return Boolean(
    config.cloudinaryCloudName &&
    config.cloudinaryApiKey &&
    config.cloudinaryApiSecret
  );
};

export const getUploadsBaseDir = (): string => {
  const directUploads = path.resolve(process.cwd(), 'uploads');
  if (fs.existsSync(directUploads)) return directUploads;
  const backendUploads = path.resolve(process.cwd(), 'backend', 'uploads');
  if (fs.existsSync(backendUploads)) return backendUploads;
  return directUploads;
};

export const saveMediaToLocal = async (
  buffer: Buffer,
  subDir: string = '',
  mimetype: string = 'image/jpeg',
  originalName: string = ''
): Promise<{ url: string; publicId: string; resourceType: string; format?: string }> => {
  const isVideo = mimetype.startsWith('video/');
  const isAudio = mimetype.startsWith('audio/');
  const isImage = mimetype.startsWith('image/');
  const isSvg = mimetype === 'image/svg+xml';

  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (isImage) {
    resourceType = 'image';
  } else if (isVideo || isAudio) {
    resourceType = 'video';
  } else {
    resourceType = 'raw';
  }

  const cleanSubDir = (subDir || '')
    .replace(/^ensis[/\\]?/, '')
    .replace(/\.\.[/\\]/g, '')
    .replace(/^[/\\]+|[/\\]+$/g, '');

  const ext =
    isImage && mimetype === 'image/webp'
      ? '.webp'
      : path.extname(originalName) || (isImage ? '.jpg' : isSvg ? '.svg' : '');

  const baseName = path
    .basename(originalName || 'file', path.extname(originalName))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);

  const fileName = `${Date.now()}-${baseName || 'upload'}${ext}`;
  const baseDir = getUploadsBaseDir();
  const folderPath = cleanSubDir ? path.join(baseDir, cleanSubDir) : baseDir;

  await fs.promises.mkdir(folderPath, { recursive: true });
  const targetPath = path.join(folderPath, fileName);
  await fs.promises.writeFile(targetPath, buffer);

  const relativeUrl = `/uploads/${cleanSubDir ? cleanSubDir + '/' : ''}${fileName}`;
  const publicId = cleanSubDir ? `${cleanSubDir}/${fileName}` : fileName;

  return {
    url: relativeUrl,
    publicId,
    resourceType,
    format: ext.replace(/^\./, ''),
  };
};

export const uploadMediaToCloudinary = async (
  buffer: Buffer,
  subDir: string = '',
  mimetype: string = 'image/jpeg',
  originalName: string = ''
): Promise<{ url: string; publicId: string; resourceType: string; format?: string }> => {
  if (!hasCloudinaryConfig()) {
    return saveMediaToLocal(buffer, subDir, mimetype, originalName);
  }

  const isVideo = mimetype.startsWith('video/');
  const isAudio = mimetype.startsWith('audio/');
  const isImage = mimetype.startsWith('image/');
  const isSvg = mimetype === 'image/svg+xml';

  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (isImage) {
    resourceType = 'image';
  } else if (isVideo || isAudio) {
    resourceType = 'video';
  } else {
    resourceType = 'raw';
  }

  const cleanSubDir = (subDir || '')
    .replace(/^ensis[/\\]?/, '')
    .replace(/\.\.[/\\]/g, '')
    .replace(/^[/\\]+|[/\\]+$/g, '');
  const folder = cleanSubDir ? `ensis/${cleanSubDir}` : 'ensis';
  const cleanName = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const publicId = `${Date.now()}-${cleanName}`;

  const options: Record<string, any> = {
    folder,
    resource_type: resourceType,
  };

  if (resourceType === 'raw') {
    options.public_id = publicId;
  }

  if (isImage && !isSvg) {
    options.format = 'webp';
    options.transformation = [
      { width: 1920, crop: 'limit' },
      { quality: 'auto' }
    ];
  }

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
          resourceType: result!.resource_type,
          format: result!.format,
        });
      });

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.warn('[upload] Cloudinary upload failed, falling back to local disk storage:', (error as Error).message);
    return saveMediaToLocal(buffer, subDir, mimetype, originalName);
  }
};

export const uploadImage = async (
  buffer: Buffer,
  subDir: string = ''
): Promise<{ url: string; publicId: string }> => {
  return uploadMediaToCloudinary(buffer, subDir, 'image/webp');
};

export const deleteImage = async (publicId: string): Promise<void> => {
  if (hasCloudinaryConfig()) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return;
    } catch {
      // ignore
    }
  }

  try {
    const baseDir = getUploadsBaseDir();
    const cleanId = publicId.replace(/^ensis[/\\]?/, '').replace(/^[/\\]+/, '');
    const target = path.resolve(baseDir, cleanId);
    if (fs.existsSync(target)) {
      await fs.promises.unlink(target);
    }
  } catch {
    // ignore
  }
};

export const listImagesFromCloudinary = async (
  subDir: string = ''
): Promise<{ name: string; url: string; resourceType?: string; format?: string }[]> => {
  if (!hasCloudinaryConfig()) {
    return [];
  }

  try {
    const cleanSubDir = (subDir || '')
      .replace(/^ensis[/\\]?/, '')
      .replace(/\.\.[/\\]/g, '')
      .replace(/^[/\\]+|[/\\]+$/g, '');
    const folder = cleanSubDir ? `ensis/${cleanSubDir}` : 'ensis';
    const result = await cloudinary.search
      .expression(`folder="${folder}"`)
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    const files = (result?.resources || []).map((res: any) => ({
      name: (res.public_id || '').split('/').pop() || res.public_id || '',
      url: res.secure_url,
      resourceType: res.resource_type,
      format: res.format,
    }));

    return files;
  } catch {
    return [];
  }
};

export const uploadResume = async (
  buffer: Buffer,
  originalName: string
): Promise<{ url: string; publicId: string }> => {
  if (hasCloudinaryConfig()) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'ensis/resumes',
            resource_type: 'raw',
            public_id: `${Date.now()}-${originalName.replace(/\s+/g, '_')}`,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({ url: result!.secure_url, publicId: result!.public_id });
          }
        );
        uploadStream.end(buffer);
      });
    } catch {
      // Fall through to local storage
    }
  }

  const local = await saveMediaToLocal(buffer, 'resumes', 'application/pdf', originalName);
  return { url: local.url, publicId: local.publicId };
};
