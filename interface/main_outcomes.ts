export interface MainOutcomesInterface {
  id: number;
  qualification_id: number;
  unit_id: number;
  main_number: string;
  description: string;
  created_by: number;
  status: number; // 1: Active, 2: Inactive
  marks: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
