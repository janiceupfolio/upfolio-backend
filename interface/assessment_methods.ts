export interface AssessmentMethodInterface {
  id: number;
  assessment_id: number;
  method_id: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}