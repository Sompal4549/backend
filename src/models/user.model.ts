import { Schema, model, Types, HydratedDocument } from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLE } from '../constants/roles.constants';

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: typeof ROLE[keyof typeof ROLE];
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  wishlist: Types.ObjectId[];
  orders: Types.ObjectId[];
  refreshToken?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, sparse: true },
    password: { type: String, select: false },
    role: { type: String, enum: Object.values(ROLE), default: ROLE.USER },
    avatar: { type: String },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (this: UserDocument, next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = model<IUser>('User', userSchema);
