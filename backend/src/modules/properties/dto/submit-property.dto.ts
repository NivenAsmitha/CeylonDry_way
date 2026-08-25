import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

export class SubmitPropertyDto {
  @ApiProperty({
    example: true,
    description: 'Explicit confirmation that the draft is ready for review',
  })
  @IsBoolean()
  @Equals(true)
  confirm!: true;
}
