export interface UserUnitsInterface {
  id: number;
  user_id: number;
  unit_id: number;
  is_sampling: boolean;
  reference_type: number;
  is_assigned: boolean;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}