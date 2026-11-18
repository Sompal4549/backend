import mongoose from 'mongoose';
import { ChatBlockModel } from '../src/models/chatbot-block.model';
import { ChatbotSessionModel } from '../src/models/chatbot-session.model';

async function unblockAll() {
  const uri = process.env.MONGO_URI_MAIN || 'mongodb://localhost:27017/ensis';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const res = await ChatBlockModel.deleteMany({});
  console.log(`Deleted ${res.deletedCount} blocked IP records.`);

  const sessRes = await ChatbotSessionModel.updateMany(
    { status: 'blocked' },
    { $set: { status: 'active' } }
  );
  console.log(`Reset ${sessRes.modifiedCount} sessions to active.`);

  await mongoose.disconnect();
  console.log('Unblock completed successfully!');
}

unblockAll().catch((err) => {
  console.error('Error unblocking:', err);
  process.exit(1);
});

