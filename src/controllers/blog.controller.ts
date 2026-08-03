import { Request, Response } from 'express';
import { BlogModel } from '../models/blog.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { notifySubscribers } from '../services/newsletter.service';

export const getAllBlogs = asyncHandler(async (_req: Request, res: Response) => {
  const blogs = await BlogModel.find({ isActive: true }).sort({ createdAt: -1 });
  successResponse(res, blogs, 'Blogs retrieved successfully');
});

export const getPopularBlogs = asyncHandler(async (_req: Request, res: Response) => {
  // Priority: isPopular manually marked first, then highest viewCount
  const blogs = await BlogModel.find({ isActive: true }).sort({ isPopular: -1, viewCount: -1 }).limit(5);
  successResponse(res, blogs, 'Popular blogs retrieved successfully');
});

export const getFeaturedBlogs = asyncHandler(async (_req: Request, res: Response) => {
  let blogs = await BlogModel.find({ isActive: true, isFeatured: true }).limit(4).lean();

  if (blogs.length < 4) {
    const extraNeeded = 4 - blogs.length;
    const featuredIds = blogs.map(b => b._id);

    const randomBlogs = await BlogModel.aggregate([
      { $match: { isActive: true, _id: { $nin: featuredIds } } },
      { $sample: { size: extraNeeded } }
    ]);

    blogs = [...blogs, ...randomBlogs];
  }

  successResponse(res, blogs, 'Featured blogs retrieved successfully');
});

export const getBlogBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  // Simple View Count: Increment viewCount by 1 every time the blog is fetched
  const blog = await BlogModel.findOneAndUpdate(
    { slug, isActive: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  );

  if (!blog) {
    throw new AppError(404, 'Blog not found');
  }
  successResponse(res, blog, 'Blog retrieved successfully');
});

export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await BlogModel.create(req.body);

  // Jab naya blog bane, subscribers ko notification jaye
  notifySubscribers(blog.title, blog.slug).catch(console.error);

  successResponse(res, blog, 'Blog created successfully', 201);
});

export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await BlogModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!blog) {
    throw new AppError(404, 'Blog not found');
  }
  successResponse(res, blog, 'Blog updated successfully');
});

export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await BlogModel.findByIdAndDelete(req.params.id);
  if (!blog) {
    throw new AppError(404, 'Blog not found');
  }
  successResponse(res, null, 'Blog deleted successfully');
});
