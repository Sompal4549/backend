const mongoose = require('./node_modules/mongoose');
const dotenv = require('./node_modules/dotenv');
dotenv.config({ path: './.env' });
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ensis').then(async () => {
  const users = await mongoose.connection.collection('users').find({ role: { $in: ['admin', 'superadmin'] } }).project({ email: 1, name: 1, role: 1, isTwoFactorEnabled: 1 }).toArray();
  console.log('Admins in DB:', JSON.stringify(users, null, 2));
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });

