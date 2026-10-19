import { isObjectIdString } from '../utils/object-id';
import { Request, Response } from 'express';
import { BlogModel } from '../models/blog.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { notifySubscribers } from '../services/newsletter.service';
import { pick } from '../utils/pick';

const BLOG_EDITABLE_FIELDS = [
  'title', 'slug', 'author', 'isActive', 'tags', 'isFeatured', 'orderBy',
  'isVoiceOfExperts', 'isPopular', 'category', 'robots', 'banner', 'blogImage',
  'ctaBanner', 'article', 'aboutTheAuthor', 'onThisPage', 'cities', 'seo',
] as const;

// GET /blogs: published posts for the website; ?all=1 (admin list) also returns drafts
export const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const filter = req.query.all === '1' ? {} : { isActive: { $ne: false } };
  const blogs = await BlogModel.find(filter).sort({ createdAt: -1 });
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
  const isId = isObjectIdString(slug);
  const query = isId ? { $or: [{ slug }, { _id: slug }] } : { slug };

  // Views are counted by POST /blogs/:slug/view from the reader's browser; the page fetch is cached
  const blog = await BlogModel.findOne(query);

  if (!blog) {
    throw new AppError(404, 'Blog not found');
  }
  successResponse(res, blog, 'Blog retrieved successfully');
});

// POST /blogs/:slug/view — one call per reader session (the website dedupes); returns the new count
export const recordBlogView = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const query = isObjectIdString(slug) ? { $or: [{ slug }, { _id: slug }] } : { slug };
  const blog = await BlogModel.findOneAndUpdate({ ...query, isActive: { $ne: false } }, { $inc: { viewCount: 1 } }, { new: true }).select('viewCount');
  if (!blog) {
    throw new AppError(404, 'Blog not found');
  }
  successResponse(res, { views: blog.viewCount }, 'View recorded');
});

export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const cleanData = pick(req.body, BLOG_EDITABLE_FIELDS);
  const blog = await BlogModel.create(cleanData);

  // Jab naya blog bane, subscribers ko notification jaye
  notifySubscribers(blog.title, blog.slug).catch(console.error);

  successResponse(res, blog, 'Blog created successfully', 201);
});

export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const cleanData = pick(req.body, BLOG_EDITABLE_FIELDS);
  const blog = await BlogModel.findByIdAndUpdate(req.params.id, cleanData, { new: true, runValidators: true });
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
