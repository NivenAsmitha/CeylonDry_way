import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PropertyStatus } from '../../../generated/prisma/client.js';

export const reviewerQueueStatuses = [
  PropertyStatus.PENDING,
  PropertyStatus.APPROVED,
  PropertyStatus.CHANGES_REQUESTED,
  PropertyStatus.REJECTED,
  PropertyStatus.SUSPENDED,
] as const;

export class ReviewerListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @ApiPropertyOptional({
    enum: reviewerQueueStatuses,
    default: PropertyStatus.PENDING,
  })
  @IsOptional()
  @IsIn(reviewerQueueStatuses)
  status?: (typeof reviewerQueueStatuses)[number];
}
