import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface IMail extends Document {
  id: string;
  mailboxId: string;
  from: string;
  to: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments: IAttachment[];
  receivedAt: Date;
  isRead: boolean;
  size: number;

  // Instance methods
  markAsRead(): void;
  hasAttachments(): boolean;
  getAttachmentCount(): number;
}

export interface IMailModel extends Model<IMail> {
  // Static methods
  findByMailboxId(
    mailboxId: string,
    options?: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    }
  ): Promise<IMail[]>;
  countByMailboxId(mailboxId: string, unreadOnly?: boolean): Promise<number>;
  deleteByMailboxId(mailboxId: string): Promise<any>;
  searchMails(
    mailboxId: string,
    searchTerm: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<IMail[]>;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    contentId: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

const MailSchema = new Schema<IMail>(
  {
    mailboxId: {
      type: String,
      required: true,
      index: true,
      ref: 'Mailbox',
    },
    from: {
      type: String,
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      default: '(No Subject)',
    },
    textContent: {
      type: String,
      required: true,
      default: '',
    },
    htmlContent: {
      type: String,
      required: false,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient queries
MailSchema.index({ mailboxId: 1, receivedAt: -1 });
MailSchema.index({ mailboxId: 1, isRead: 1 });

// Text index for search functionality
MailSchema.index({
  subject: 'text',
  textContent: 'text',
  from: 'text',
});

// Instance methods
MailSchema.methods.markAsRead = function (): void {
  this.isRead = true;
};

MailSchema.methods.hasAttachments = function (): boolean {
  return this.attachments && this.attachments.length > 0;
};

MailSchema.methods.getAttachmentCount = function (): number {
  return this.attachments ? this.attachments.length : 0;
};

// Static methods
MailSchema.statics.findByMailboxId = function (
  mailboxId: string,
  options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}
) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  const skip = (page - 1) * limit;

  const query: any = { mailboxId };
  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query).sort({ receivedAt: -1 }).skip(skip).limit(limit);
};

MailSchema.statics.countByMailboxId = function (
  mailboxId: string,
  unreadOnly = false
) {
  const query: any = { mailboxId };
  if (unreadOnly) {
    query.isRead = false;
  }
  return this.countDocuments(query);
};

MailSchema.statics.deleteByMailboxId = function (mailboxId: string) {
  return this.deleteMany({ mailboxId });
};

MailSchema.statics.searchMails = function (
  mailboxId: string,
  searchTerm: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    mailboxId,
    $text: { $search: searchTerm },
  })
    .sort({ score: { $meta: 'textScore' }, receivedAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const Mail = mongoose.model<IMail, IMailModel>('Mail', MailSchema);
