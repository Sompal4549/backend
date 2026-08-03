import { AppError } from '../utils/app-error';
import { MediaModel, IMedia } from '../models/media.model';
import { uploadImage, deleteImage } from '../helpers/image.helper';

export const saveMedia = async (buffer: Buffer, mimetype: string, size: number, userId: string): Promise<IMedia> => {
  const { url, publicId } = await uploadImage(buffer, 'media');
  const media = await MediaModel.create({ filename: publicId, url, mimetype, size, uploadedBy: userId });
  return media;
};

export const removeMedia = async (id: string) => {
  const media = await MediaModel.findById(id);
  if (!media) {
    throw new AppError(404, 'Media item not found');
  }
  await deleteImage(media.filename);
  await media.deleteOne();
  return media;
};
