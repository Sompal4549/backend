import { EnquiryModel, IEnquiry } from '../models/enquiry.model';

export const createEnquiry = async (data: Partial<IEnquiry>) => {
  return EnquiryModel.create(data);
};

export const findAllEnquiries = async () => {
  return EnquiryModel.find().sort({ createdAt: -1 });
};

export const updateEnquiryById = async (id: string, update: Partial<IEnquiry>) => {
  return EnquiryModel.findByIdAndUpdate(id, update, { new: true });
};

export const findEnquiryById = async (id: string) => EnquiryModel.findById(id);