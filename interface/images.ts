export interface ImageInterface {
  id: number;
  entity_type: string;
  entity_id: number;
  image: string;
  image_type: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  image_name?: string;
  image_size?: string;
}