export interface UserQualificationInterface {
  id: number;
  user_id: number;
  qualification_id: number;
  status: number;
  is_signed_off: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
