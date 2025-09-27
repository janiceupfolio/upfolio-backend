export interface AssessmentNotesInterface {
  id: number;
  assessment_id: number;
  user_id: number;
  uploaded_by: string;
  feedback: string;
  is_main_assessment_note: boolean;
  cycle: number;
  workflow_phase: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  status: number;
}