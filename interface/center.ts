export interface CenterInterface {
  id: number;
  center_name: string;
  center_admin: number;
  status: number;
  center_address: string;
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
