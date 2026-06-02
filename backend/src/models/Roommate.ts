import mongoose, { Schema, Document } from 'mongoose';

export interface IRoommateImageDetail {
  url: string;
  category: string;
}

export interface IRoommate extends Document {
  userId: mongoose.Types.ObjectId;
  bio: string;
  age: number;
  gender: string;
  occupation: string;
  socialStatus: string;
  city: string;
  phone: string;
  moveInDate: Date;
  budget: number;
  roomPreference: string;
  description: string;
  images: string[];
  imageDetails: IRoommateImageDetail[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoommateSchema = new Schema<IRoommate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    occupation: { type: String, required: true },
    socialStatus: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    moveInDate: { type: Date, required: true },
    budget: { type: Number, required: true },
    roomPreference: String,
    description: { type: String, required: true },
    images: [String],
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    reviewNote: { type: String, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    imageDetails: [
      {
        url: { type: String, required: true },
        category: { type: String, default: 'General' }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<IRoommate>('Roommate', RoommateSchema);
