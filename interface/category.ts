export interface CategoryInterface {
  id: number;
  category_name: string;
  status: number;
  is_mandatory: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}