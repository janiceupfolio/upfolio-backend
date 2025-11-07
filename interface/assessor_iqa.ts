export interface AssessorIQAInterface {
  id: number;
  assessor_id: number;
  iqa_id: number;
  qualification_ids: number[];
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}