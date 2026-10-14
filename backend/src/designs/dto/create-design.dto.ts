import { IsString } from 'class-validator';

export class CreateDesignDto {
  @IsString()
  productId: string;

  @IsString()
  colorId: string;
}
