export interface AssessmentMarksInterface {
    id: number;
    assessment_id: number;
    learner_id: number;
    assessor_id: number;
    qualification_id: number;
    unit_id?: number | null;
    main_outcome_id?: number | null;
    sub_outcome_id?: number | null;
    subpoint_id?: number | null;
    marks: string;
    max_marks: string;
    attempt: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}