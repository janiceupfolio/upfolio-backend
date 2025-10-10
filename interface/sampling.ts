export interface SamplingInterface {
  id: number;
  learner_id: number;
  date: string;
  assessor_id: number;
  sampling_type: number;
  qualification_id: number;
  iqa_notes: string;
  is_assessment_assessed: string;
  is_learner_work: string;
  is_assessed_by_other_assessor: string;
  is_learner_competance: string;
  is_assessment_sufficient: string;
  is_accept_sampling: string;
  action_date: string;
  further_action_note: string;
  reference_type: number;
  created_by: number;
  center_id: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
