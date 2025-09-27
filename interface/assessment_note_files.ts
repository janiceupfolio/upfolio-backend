export interface AssessmentNoteFilesInterface {
  id: number;
  assessment_note_id: number;
  file_id: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}