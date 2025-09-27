export interface ModuleRecordsInterface {
  id: number;
  module_type: number; // 1: resources, 2: journal, 3: additional_info, 4: contact_log
  title: string;
  date: string;
  center_id: number;
  notes: string;
  created_by: number;
  is_learner_or_qualification: number;
  status: number; // 1: Active, 2: Inactive
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  delete_files?: string;
  learners?: string;
  qualifications?: string;
}
