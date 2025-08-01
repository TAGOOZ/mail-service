import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMailbox extends Document {
  id: string;
  address: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  extensionCount: number;
  isActive: boolean;
  lastAccessAt: Date;

  // Instance methods
  isExpired(): boolean;
  canExtend(): boolean;
  extend(): void;
}

export interface IMailboxModel extends Model<IMailbox> {
  // Static methods
  findByToken(token: string): Promise<IMailbox | null>;
  findActiveMailboxes(): Promise<IMailbox[]>;
  findExpiredMailboxes(): Promise<IMailbox[]>;
}

const MailboxSchema = new Schema<IMailbox>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^[a-zA-Z0-9._%+-]+@nnu\.edu\.kg$/,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    extensionCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastAccessAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.token; // Don't expose token in JSON responses
        return ret;
      },
    },
  }
);

// Index for efficient cleanup of expired mailboxes
MailboxSchema.index({ expiresAt: 1, isActive: 1 });

// Index for token-based lookups
MailboxSchema.index({ token: 1, isActive: 1 });

// TTL index to automatically remove expired mailboxes
MailboxSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
MailboxSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

MailboxSchema.methods.canExtend = function (): boolean {
  return this.extensionCount < 2;
};

MailboxSchema.methods.extend = function (): void {
  if (this.canExtend()) {
    this.expiresAt = new Date(this.expiresAt.getTime() + 12 * 60 * 60 * 1000); // Add 12 hours
    this.extensionCount += 1;
  }
};

// Static methods
MailboxSchema.statics.findByToken = function (token: string) {
  return this.findOne({ token, isActive: true });
};

MailboxSchema.statics.findActiveMailboxes = function () {
  return this.find({ isActive: true, expiresAt: { $gt: new Date() } });
};

MailboxSchema.statics.findExpiredMailboxes = function () {
  return this.find({ expiresAt: { $lt: new Date() } });
};

export const Mailbox = mongoose.model<IMailbox, IMailboxModel>(
  'Mailbox',
  MailboxSchema
);
