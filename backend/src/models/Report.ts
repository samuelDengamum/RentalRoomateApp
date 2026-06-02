import mongoose, { Schema, Document } from 'mongoose';

export type ReportReason = 'spam' | 'inappropriate' | 'fraud' | 'harassment' | 'misleading' | 'other';
export type ReportTargetType = 'user' | 'property';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  adminNote: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['user', 'property'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'fraud', 'harassment', 'misleading', 'other'],
      required: true
    },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    adminNote: { type: String, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
