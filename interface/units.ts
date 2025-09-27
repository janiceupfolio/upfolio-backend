export interface UnitsInterface {
  id: number;
  qualification_id: number;
  unit_title: string;
  unit_number: string;
  unit_ref_no: string;
  marks: string;
  status: number; // 1: Active, 2: Inactive
  created_by: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
