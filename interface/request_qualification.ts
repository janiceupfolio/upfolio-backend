export interface RequestQualificationInterface {
  id: number;
  awarding_body: string;
  qualification_title: string;
  qualification_number: string;
  note: string;
  request_status: number; // 1: Pending | 2: Approved | 3: Rejected
  status: number;
  center_id: number;
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
