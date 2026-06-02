import mongoose, { Document, Schema } from 'mongoose';

export interface ITourRequest extends Document {
  propertyId: mongoose.Types.ObjectId;
  renterId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  requesterName: string;
  senderEmail: string;
  phone: string;
  subject: string;
  message: string;
  tourDate?: string;
  tourTime?: string;
  paymentMethod: 'mobile_money' | 'bank_transfer' | 'card' | 'cash_deposit';
  paymentReference?: string;
  paymentProofUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewerNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TourRequestSchema = new Schema<ITourRequest>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    landlordId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    tourDate: String,
    tourTime: String,
    paymentMethod: {
      type: String,
      enum: ['mobile_money', 'bank_transfer', 'card', 'cash_deposit'],
      required: true
    },
    paymentReference: String,
    paymentProofUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending'
    },
    reviewerNote: String,
    reviewedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model<ITourRequest>('TourRequest', TourRequestSchema);