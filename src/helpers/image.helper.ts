import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/app.config';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export const uploadImage = async (
  buffer: Buffer,
  subDir: string = ''
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ensis/${subDir}`.replace(/\/$/, ''),
        resource_type: 'image',
        format: 'webp',
        transformation: [
          { width: 1920, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

export const listImagesFromCloudinary = async (
  subDir: string = ''
): Promise<{ name: string; url: string }[]> => {
  const folder = subDir ? `ensis/${subDir}` : 'ensis';
  const result = await cloudinary.search
    .expression(`folder="${folder}"`)
    .sort_by('created_at', 'desc')
    .max_results(500)
    .execute();

  const files = (result?.resources || []).map((res: any) => ({
    name: (res.public_id || '').split('/').pop() || res.public_id || '',
    url: res.secure_url,
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