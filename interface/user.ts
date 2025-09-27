export interface AuthResponse {
  status: number;
  message: string;
  data?: any;
  total_count?: number;
}

export interface UserInterface {
  id: number;
  name: string;
  surname: string;
  login_token?: string;
  phone_number?: string;
  phone_code?: string;
  email: string;
  role: number;
  about: string;
  trainee: boolean;
  theme_color: string; // Added theme_color field
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  qualifications?: string;
  date_of_birth?: string;
  address?: string;
  gender?: number;
  learning_difficulties?: boolean;
  off_the_job_training?: number;
  entitlement_date?: string;
  start_date?: string;
  expected_end_date?: string;
  employer?: string;
  center_id?: number; 
  employer_address?: string;
  center_name?: string; // Added center_name field
  learners?: string;
  access_start_date?: string;
  access_end_date?: string;
  awarding_name?: string;
  ethnicity?: string;
  center_address?: string;
  additional_learning_text?: string;
  default_center_id?: number; // Optional field for default center
  additional_learning_needs?: number; // 1: Yes | 2: No | 3: Prefer not to say
  assessors?: string;
  iqas?: string;
  additional_iqa_id?: number; // Optional field for additional IQA ID
  additional_assessor_id?: number; // Optional field for additional Assessor ID
  license_year?: number;
  license_year_expiry?: string;
}

export interface userAuthenticationData {
  id?: number;
  name?: string;
  surname?: string;
  email?: string;
  role?: number;
  phone_number?: string;
  phone_code?: string;
  data?: string;
  center_id?: number;
}
