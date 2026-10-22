import { EnquiryModel, IEnquiry } from '../models/enquiry.model';
import { escapeRegex } from '../utils/escape-regex';

export const createEnquiry = async (data: Partial<IEnquiry>) => {
  return EnquiryModel.create(data);
};

export const findAllEnquiries = async () => {
  return EnquiryModel.find().sort({ createdAt: -1 });
};

export const getEnquiryPaginated = async (options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (options.status) {
    filter.status = options.status;
  }

  if (options.search) {
    const searchRegex = { $regex: escapeRegex(options.search), $options: 'i' };
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { mobileNumber: searchRegex },
      { projectType: searchRegex },
    ];
  }

  const [enquiries, total] = await Promise.all([
    EnquiryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    EnquiryModel.countDocuments(filter),
  ]);

  return {
    enquiries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const exportAllEnquiries = async () => {
  return EnquiryModel.find().sort({ createdAt: -1 });
};

export const updateEnquiryById = async (id: string, update: Partial<IEnquiry>) => {
  return EnquiryModel.findByIdAndUpdate(id, update, { new: true });
};

export const findEnquiryById = async (id: string) => EnquiryModel.findById(id);

export const deleteEnquiryById = async (id: string) => EnquiryModel.findByIdAndDelete(id);