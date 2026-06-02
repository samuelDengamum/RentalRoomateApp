import { Schema, model, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  userId: Types.ObjectId;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'dismissed';
  adminNote?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true
    },
    adminNote: { type: String, trim: true, default: '' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default model<IFeedback>('Feedback', feedbackSchema);
