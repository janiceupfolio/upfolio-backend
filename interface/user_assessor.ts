export interface UserAssessorInterface {
  id: number;
  user_id: number;
  assessor_id: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
}