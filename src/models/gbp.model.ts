import mongoose, { Schema, Document } from 'mongoose';

/**
 * Google Business Profile integration storage.
 * One connection document (the linked Google account) and the reviews synced from it.
 * OAuth tokens are stored encrypted (AES-256-GCM, ENCRYPTION_MASTER_KEY), never in plain text.
 */

export interface IGbpLocation {
  locationId: string;
  name: string;
  city: string;
  address: string;
  profileUrl?: string | null;
}

export interface IGbpConnection extends Document {
  googleEmail: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt?: Date | null;
  selectedAccountId?: string | null;
  locations: IGbpLocation[];
  /** ok | token_expired | revoked | error */
  oauthHealth: string;
  lastSuccessfulSync?: Date | null;
  connectedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GbpLocationSchema = new Schema<IGbpLocation>(
  {
    locationId: { type: String, required: true },
    name: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    profileUrl: { type: String, default: null },
  },
  { _id: false }
);

const GbpConnectionSchema = new Schema<IGbpConnection>(
  {
    googleEmail: { type: String, default: '' },
    accessTokenEnc: { type: String, default: '', select: false },
    refreshTokenEnc: { type: String, default: '', select: false },
    tokenExpiresAt: { type: Date, default: null },
    selectedAccountId: { type: String, default: null },
    locations: { type: [GbpLocationSchema], default: [] },
    oauthHealth: { type: String, default: 'ok' },
    lastSuccessfulSync: { type: Date, default: null },
    connectedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export interface IGbpReview extends Document {
  googleReviewId: string;
  reviewerName: string;
  reviewerPhoto?: string | null;
  rating: number;
  comment: string;
  locationId: string;
  locationName: string;
  createTime: Date;
  updateTime: Date;
  replyComment?: string | null;
  replyUpdateTime?: Date | null;
  lastSyncedAt: Date;
}

const GbpReviewSchema = new Schema<IGbpReview>(
  {
    googleReviewId: { type: String, required: true },
    reviewerName: { type: String, default: '' },
    reviewerPhoto: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    locationId: { type: String, required: true },
    locationName: { type: String, default: '' },
    createTime: { type: Date, required: true },
    updateTime: { type: Date, required: true },
    replyComment: { type: String, default: null },
    replyUpdateTime: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GbpReviewSchema.index({ googleReviewId: 1 }, { unique: true });
GbpReviewSchema.index({ locationId: 1, createTime: -1 });

export const GbpConnectionModel = mongoose.model<IGbpConnection>('GbpConnection', GbpConnectionSchema);
export const GbpReviewModel = mongoose.model<IGbpReview>('GbpReview', GbpReviewSchema);
