export interface QualificationsInterface {
  id: number;
  name: string;
  qualification_no: string;
  status: number; // 1: Active, 2: Inactive
  created_by: number;
  qualification_file: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
