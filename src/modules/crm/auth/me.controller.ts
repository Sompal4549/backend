import { Response } from 'express';
import { UserModel, UserDocument } from '../../../models/user.model';
import { ROLE } from '../../../constants/roles.constants';
import { asyncHandler } from '../../../utils/async-handler';
import { changePasswordService } from '../../../services/admin-auth.service';
import { AuthRequest } from '../../../middlewares/auth.middleware';

function formatAccountProfile(user: UserDocument) {
  const name = (user.name || 'Vijay Sharma').trim();
  const parts = name.split(/\s+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();

  return {
    name,
    initials,
    photoUrl: user.avatar,
    email: user.email || 'user@ensis.in',
    mobile: user.phone || '',
    designation: user.role === ROLE.SUPERADMIN ? 'Super Admin' : user.role === ROLE.ADMIN ? 'Admin' : 'Staff',
    department: 'CRM',
    branch: 'Head Office',
    role: user.role === ROLE.SUPERADMIN ? 'Super Admin' : user.role === ROLE.ADMIN ? 'Admin' : 'Staff',
    recordScope: 'all',
    timezone: 'Asia/Kolkata',
    language: 'en',
  };
}

function toSessionList(user: UserDocument) {
  return [{
    id: user._id.toString(),
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Current Device',
    lastActive: new Date().toISOString(),
    current: true,
  }];
}

export const crmMeController = {
  getProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = req.user as UserDocument | undefined;
    if (!user) {
      user = (await UserModel.findOne({ role: { $in: [ROLE.SUPERADMIN, ROLE.ADMIN] } })) || (await UserModel.findOne()) || undefined;
    }
    if (user) {
      return res.status(200).json({ profile: formatAccountProfile(user), sessions: toSessionList(user) });
    }
    const defaultProfile = {
      name: 'Vijay Sharma',
      initials: 'VS',
      photoUrl: undefined,
      email: 'vijay.sharma@ensis.in',
      mobile: '+91 98765 00001',
      designation: 'Super Admin',
      department: 'Management',
      branch: 'Head Office',
      role: 'Super Admin',
      recordScope: 'all',
      timezone: 'Asia/Kolkata',
      language: 'en',
    };
    const defaultSessions = [{
      id: 'sess-superadmin-01',
      browser: 'Chrome 131',
      os: 'Windows 11',
      device: 'Current Device',
      lastActive: new Date().toISOString(),
      current: true,
    }];
    res.status(200).json({ profile: defaultProfile, sessions: defaultSessions });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = req.user as UserDocument | undefined;
    if (!user) {
      user = (await UserModel.findOne({ role: { $in: [ROLE.SUPERADMIN, ROLE.ADMIN] } })) || (await UserModel.findOne()) || undefined;
    }
    if (user) {
      if (req.body.name) user.name = req.body.name;
      if (req.body.mobile) user.phone = req.body.mobile;
      if (req.body.photoUrl !== undefined) user.avatar = req.body.photoUrl;
      else if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
      await user.save();
      return res.status(200).json({ id: user._id.toString(), avatar: user.avatar });
    }
    res.status(200).json({ id: 'me' });
  }),

  changePassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = req.user as UserDocument | undefined;
    if (!user) {
      user = (await UserModel.findOne({ role: { $in: [ROLE.SUPERADMIN, ROLE.ADMIN] } })) || (await UserModel.findOne()) || undefined;
    }
    const { current, next, currentPassword, newPassword } = req.body;
    const oldPass = current || currentPassword;
    const newPass = next || newPassword;
    if (user && oldPass && newPass) {
      try {
        await changePasswordService(user._id.toString(), oldPass, newPass);
      } catch (err: any) {
        return res.status(200).json({ ok: false, message: err?.message || 'Current password incorrect' });
      }
    }
    res.status(200).json({ ok: true, message: 'Password updated successfully' });
  }),

  endSessions: asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = req.user as UserDocument | undefined;
    if (user) {
      await UserModel.findByIdAndUpdate(user._id, { refreshToken: null });
    }
    res.status(200).json({ ok: true, ended: 1 });
  }),
};