export interface AssessmentLearnerInterface {
  id: number;
  learner_id: number;
  assessment_id: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}