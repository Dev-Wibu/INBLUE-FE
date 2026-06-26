export interface MentorProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  public_id?: string | null;
  bio?: string;
  expertise?: string;
  yearsOfExperience?: number;
  linkedInUrl?: string;
  currentCompany?: string;
  pricePerMinute?: number;
  averageRating?: number;
  totalSession?: number;
  active?: boolean;
  createdAt?: string;
}
