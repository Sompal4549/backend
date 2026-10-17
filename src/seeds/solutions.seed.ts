import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { SolutionModel } from '../models/solution.model';
import solutions from './data/solutions.json';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Seeds the five Ensis solutions (content taken from the storefront's former static data).
 * Insert-only: a solution that already exists keeps every admin edit.
 * Images stay empty so the storefront keeps its bundled images until the admin uploads new ones.
 */
const main = async (): Promise<void> => {
  await connectDatabase();
  try {
    let inserted = 0;
    for (const solution of solutions) {
      const result = await SolutionModel.updateOne(
        { slug: solution.slug },
        { $setOnInsert: solution },
        { upsert: true }
      );
      if (result.upsertedCount) inserted += 1;
    }
    console.log(`solutions: ${inserted} inserted, ${solutions.length - inserted} already present`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('SOLUTIONS SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
