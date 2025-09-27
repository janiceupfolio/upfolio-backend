export interface SubOutcomesInterface {
  id: number;
  main_outcome_id: number;
  qualification_id: number;
  unit_id: number;
  outcome_number: string;
  description: string;
  status: number; // 1: Active, 2: Inactive
  created_by: number;
  marks: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
