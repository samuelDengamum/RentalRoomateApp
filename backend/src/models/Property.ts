import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty extends Document {
  landlordId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: 'apartment' | 'house' | 'condo' | 'room';
  rent: number;
  touringFee: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  amenities: string[];
  images: string[];
  available: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  availableDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fixedTouringFee = Number(process.env.FIXED_TOURING_FEE_RWF || 5000);

const PropertySchema = new Schema<IProperty>(
  {
    landlordId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    propertyType: { 
      type: String, 
      enum: ['apartment', 'house', 'condo', 'room'], 
      required: true 
    },
    rent: { type: Number, required: true },
    touringFee: { type: Number, required: true, default: Number.isFinite(fixedTouringFee) ? fixedTouringFee : 5000 },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    squareFeet: { type: Number, required: true },
    amenities: [String],
    images: [String],
    available: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    reviewNote: { type: String, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    availableDate: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model<IProperty>('Property', PropertySchema);
