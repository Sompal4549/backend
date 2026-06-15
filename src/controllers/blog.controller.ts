import { Request, Response } from 'express';
import { BlogModel } from '../models/blog.model';
import { successResponse, errorResponse } from '../utils/api-response';
import { notifySubscribers } from '../services/newsletter.service';

export const getAllBlogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const blogs = await BlogModel.find({ isActive: true }).sort({ createdAt: -1 });
    successResponse(res, blogs, 'Blogs retrieved successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const getPopularBlogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Priority: isPopular manually marked first, then highest viewCount
    const blogs = await BlogModel.find({ isActive: true }).sort({ isPopular: -1, viewCount: -1 }).limit(5);
    successResponse(res, blogs, 'Popular blogs retrieved successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const getFeaturedBlogs = async (_req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const getBlogBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Simple View Count: Increment viewCount by 1 every time the blog is fetched
    const blog = await BlogModel.findOneAndUpdate(
      { slug, isActive: true }, 
      { $inc: { viewCount: 1 } }, 
      { new: true }
    );

    if (!blog) {
      errorResponse(res, 'Blog not found', 404);
      return;
    }
    successResponse(res, blog, 'Blog retrieved successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await BlogModel.create(req.body);
    
    // Jab naya blog bane, subscribers ko notification jaye
    notifySubscribers(blog.title, blog.slug).catch(console.error);

    successResponse(res, blog, 'Blog created successfully', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const updateBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await BlogModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!blog) {
      errorResponse(res, 'Blog not found', 404);
      return;
    }
    successResponse(res, blog, 'Blog updated successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await BlogModel.findByIdAndDelete(req.params.id);
    if (!blog) {
      errorResponse(res, 'Blog not found', 404);
      return;
    }
    successResponse(res, null, 'Blog deleted successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};