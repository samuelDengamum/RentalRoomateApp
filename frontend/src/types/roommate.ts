export type ImageCategory = 'General' | 'Bedroom' | 'Bathroom' | 'Kitchen' | 'Living Area' | 'Exterior';

export interface ImageDetail {
  url: string;
  category: ImageCategory;
}

export interface RoommateProfile {
  _id: string;
  bio: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  occupation: string;
  socialStatus: string;
  city: string;
  phone: string;
  moveInDate: string;
  budget: number;
  roomPreference: string;
  description: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  images?: string[];
  imageDetails?: ImageDetail[];
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    location: string;
  };
}

export interface RoommateListResponse {
  data: RoommateProfile[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export const IMAGE_CATEGORY_OPTIONS: ImageCategory[] = [
  'General',
  'Bedroom',
  'Bathroom',
  'Kitchen',
  'Living Area',
  'Exterior'
];

export const GENDER_OPTIONS: Array<RoommateProfile['gender']> = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
];
