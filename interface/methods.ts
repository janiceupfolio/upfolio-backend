export interface MethodsInterface {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number; // 1: Active, 2: Inactive
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
