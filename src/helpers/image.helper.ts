import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/app.config';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export const uploadMediaToCloudinary = async (
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

  const folder = `ensis/${subDir}`.replace(/\/+$/, '');
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

  return new Promise((resolve, reject) => {
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
};

export const uploadImage = async (
  buffer: Buffer,
  subDir: string = ''
): Promise<{ url: string; publicId: string }> => {
  return uploadMediaToCloudinary(buffer, subDir, 'image/webp');
};

export const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

export const listImagesFromCloudinary = async (
  subDir: string = ''
): Promise<{ name: string; url: string; resourceType?: string; format?: string }[]> => {
  const folder = subDir ? `ensis/${subDir}` : 'ensis';
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
};


export const uploadResume = async (
  buffer: Buffer,
  originalName: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
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
};