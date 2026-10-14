import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class DesignLayerInputDto {
  @IsIn(['FRONT', 'BACK'])
  side: 'FRONT' | 'BACK';

  @IsIn(['IMAGE', 'TEXT'])
  type: 'IMAGE' | 'TEXT';

  @ValidateIf((o) => o.type === 'IMAGE')
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @ValidateIf((o) => o.type === 'TEXT')
  @IsString()
  text?: string;

  @ValidateIf((o) => o.type === 'TEXT')
  @IsString()
  fontFamily?: string;

  @ValidateIf((o) => o.type === 'TEXT')
  @IsInt()
  fontSize?: number;

  @ValidateIf((o) => o.type === 'TEXT')
  @IsString()
  color?: string;

  @ValidateIf((o) => o.type === 'TEXT')
  @IsOptional()
  @IsIn(['left', 'center', 'right'])
  textAlign?: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsNumber()
  rotation: number;

  @IsInt()
  zIndex: number;
}

export class UpdateDesignDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DesignLayerInputDto)
  layers: DesignLayerInputDto[];
}
