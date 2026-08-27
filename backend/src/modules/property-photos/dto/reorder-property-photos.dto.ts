import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';
import { MAX_PROPERTY_PHOTOS } from '../property-photo.constants';

export class ReorderPropertyPhotosDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: MAX_PROPERTY_PHOTOS })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PROPERTY_PHOTOS)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  photoIds!: string[];
}
