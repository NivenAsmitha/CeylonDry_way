import { ApiProperty } from '@nestjs/swagger';

export class FacilityRatingSummaryDto {
  @ApiProperty({ minimum: 0 })
  count!: number;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true })
  overall!: number | null;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true })
  cleanliness!: number | null;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true })
  safety!: number | null;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true })
  accessibility!: number | null;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true })
  accuracy!: number | null;
}

export class FacilityRatingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  cleanliness!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  safety!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  accessibility!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  accuracy!: number;

  @ApiProperty({ nullable: true })
  reviewText!: string | null;

  @ApiProperty({ format: 'date', nullable: true })
  visitDate!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class DeleteFacilityRatingResponseDto {
  @ApiProperty()
  deleted!: boolean;
}
