import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  author: string;
  isActive: boolean;
  isFeatured: boolean;
  isVoiceOfExperts: boolean;
  isPopular: boolean;
  viewCount: number;
  readBy: Types.ObjectId[];
  category?: string;
  robots?: string;

  banner?: {
    title: string;
    highlight: string;
    date: string | Date;
    readingTime: string;
    category: string;
    backgroundImage: string;
    backgroundImageAlt: string;
  };

  blogImage?: {
    image: string;
    alt: string;
  };

  ctaBanner?: {
    title: string;
    lotusImage: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    bannerImage:string;
  };

  article?: {
    content: string;
  };

  aboutTheAuthor?: {
    title: string;
    name: string;
    description: string;
    socialLinks: {
      iconImage: string;
      title: string;
      link: string;
    }[];
  };

  onThisPage?: {
    title: string;
  };

  expert?: {
    image: string;
    name: string;
    quote: string;
    role: string;
  };

  newsletter?: {
    lotusImage: {
      image: string;
      alt: string;
    };
    title: string;
    description: string;
    followText: string;
    followLinks: {
      image: string;
      path: string;
    }[];
  };

  downloadMedia?: {
    title: string;
    image: string;
    description: string;
    link: string;
  };

  seo?: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonical: string;
    ogJson: string;
    schema: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    category: { type: String, default: "" },
    robots: { type: String, default: "index, follow" },

    banner: {
      title: String,
      highlight: String,
      date: Date,
      readingTime: String,
      category: String,
      backgroundImage: String,
      backgroundImageAlt: String,
    },

    blogImage: {
      image: String,
      alt: String,
    },

    ctaBanner: {
      title: String,
      lotusImage: String,
      description: String,
      buttonText: String,
      buttonLink: String,
      bannerImage: String,
    },

    article: {
      content: { type: String },
    },

    aboutTheAuthor: {
      title: String,
      name: String,
      description: String,
      socialLinks: [{ iconImage: String, title: String, link: String }],
    },

    onThisPage: { title: String },

    expert: {
      image: String,
      name: String,
      quote: String,
      role: String,
    },

    newsletter: {
      lotusImage: {
        image: String,
        alt: String,
      },
      title: String,
      description: String,
      followText: String,
      followLinks: [{ image: String, path: String }],
    },

    downloadMedia: {
      title: String,
      image: String,
      description: String,
      link: String,
    },

    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: { type: String, default: "" },
      canonical: { type: String, default: "" },
      ogJson: { type: String, default: "" },
      schema: { type: String, default: "" },
    },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVoiceOfExperts: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },

    viewCount: { type: Number, default: 0 },

    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);