import { MediaModel, IMedia } from '../models/media.model.ts';
import { uploadImage, deleteImage } from '../helpers/image.helper.ts';

export const saveMedia = async (buffer: Buffer, mimetype: string, size: number, userId: string): Promise<IMedia> => {
  const { url, publicId } = await uploadImage(buffer, 'media');
  const media = await MediaModel.create({ filename: publicId, url, mimetype, size, uploadedBy: userId });
  return media;
};

export const removeMedia = async (id: string) => {
  const media = await MediaModel.findById(id);
  if (!media) {
    const error = new Error('Media item not found');
    (error as any).statusCode = 404;
    throw error;
  }
  await deleteImage(media.filename);
  await media.deleteOne();
  return media;
};
