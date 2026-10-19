import mongoose, { Schema, Document } from 'mongoose';

export interface ICareerCounter extends Document {
  _id: string; // e.g. "career_2026"
  seq: number;
}

const CareerCounterSchema = new Schema<ICareerCounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const CareerCounterModel = mongoose.model<ICareerCounter>('CareerCounter', CareerCounterSchema, 'career_counters');

export async function getNextApplicationId(year: number = new Date().getFullYear()): Promise<string> {
  const counterId = `career_${year}`;
  const record = await CareerCounterModel.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const sequence = String(record.seq).padStart(5, '0');
  return `ENS-CAR-${year}-${sequence}`;
}
