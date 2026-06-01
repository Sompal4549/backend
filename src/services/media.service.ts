import { MediaModel, IMedia } from '../models/media.model';
import { optimizeImage, deleteImage } from '../helpers/image.helper';

export const saveMedia = async (buffer: Buffer, originalName: string, mimetype: string, size: number, userId: string): Promise<IMedia> => {
  const filename = await optimizeImage(buffer, originalName);
  const url = `/uploads/${filename}`;
  const media = await MediaModel.create({ filename, url, mimetype, size, uploadedBy: userId });
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
