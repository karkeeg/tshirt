import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  designId: string;

  @IsIn(['S', 'M', 'L', 'XL', 'XXL'])
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';

  @IsString()
  @MinLength(1)
  shippingName: string;

  @IsString()
  @MinLength(1)
  shippingPhone: string;

  @IsString()
  @MinLength(1)
  shippingAddress: string;

  @IsString()
  @MinLength(1)
  shippingCity: string;
}
