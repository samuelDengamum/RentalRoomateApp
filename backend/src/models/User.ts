import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'renter' | 'landlord';
  role: 'user' | 'admin';
  banned: boolean;
  profileImage?: string;
  bio?: string;
  location: string;
  country: string;
  preferredLanguage: 'en' | 'fr' | 'ar';
  preferredLocale: string;
  preferredCurrency: 'RWF' | 'USD' | 'EUR';
  landlordSubscription?: {
    status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'expired';
    planType?: string;
    planMonths: number;
    paymentProofUrl?: string;
    paymentReference?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewNote?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  };
  marketingConsent: boolean;
  consentVersion?: string;
  consentAcceptedAt?: Date;
  privacyPolicyAcceptedAt?: Date;
  favorites: mongoose.Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    userType: { type: String, enum: ['renter', 'landlord'], required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    banned: { type: Boolean, default: false },
    profileImage: String,
    bio: String,
    location: { type: String, required: true },
    country: { type: String, default: 'RW' },
    preferredLanguage: { type: String, enum: ['en', 'fr', 'ar'], default: 'en' },
    preferredLocale: { type: String, default: 'en-RW' },
    preferredCurrency: { type: String, enum: ['RWF', 'USD', 'EUR'], default: 'RWF' },
    landlordSubscription: {
      status: {
        type: String,
        enum: ['not_submitted', 'pending', 'approved', 'rejected', 'expired'],
        default: 'not_submitted'
      },
      planType: String,
      planMonths: { type: Number, default: 1 },
      paymentProofUrl: String,
      paymentReference: String,
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewNote: String,
      currentPeriodStart: Date,
      currentPeriodEnd: Date
    },
    marketingConsent: { type: Boolean, default: false },
    consentVersion: String,
    consentAcceptedAt: Date,
    privacyPolicyAcceptedAt: Date,
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
