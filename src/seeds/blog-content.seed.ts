import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { BlogModel } from '../models/blog.model';
import { BLOG_ARTICLES } from './data/blog-articles';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Articles shorter than this are still the one-line placeholder; anything longer was written in the admin */
const PLACEHOLDER_MAX_CHARS = 1200;

const readingTime = (html: string): string => {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

/**
 * Fills the starter blogs with full articles. Only replaces placeholder content,
 * so a blog edited in the admin keeps its text.
 */
const main = async (): Promise<void> => {
  await connectDatabase();
  try {
    let filled = 0;
    let kept = 0;
    for (const [slug, article] of Object.entries(BLOG_ARTICLES)) {
      const blog = await BlogModel.collection.findOne({ slug });
      if (!blog) {
        console.log(`skip ${slug}: blog not found`);
        continue;
      }
      const current = String((blog as any).article?.content || '');
      if (current.length > PLACEHOLDER_MAX_CHARS) {
        kept += 1;
        continue;
      }
      const content = article.content.trim();
      await BlogModel.collection.updateOne(
        { _id: blog._id },
        {
          $set: {
            'article.content': content,
            'banner.readingTime': readingTime(content),
            tags: article.tags,
            updatedAt: new Date(),
          },
        }
      );
      filled += 1;
    }
    console.log(`blog content: ${filled} filled, ${kept} kept (already written)`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('BLOG CONTENT SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
