export interface OutcomeSubpointsInterface {
  id: number;
  outcome_id: number;
  point_text: string;
  status: number; // 1: Active, 2: Inactive
  created_by: number;
  marks: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
