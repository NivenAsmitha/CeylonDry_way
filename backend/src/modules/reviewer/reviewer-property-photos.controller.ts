import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  MAX_PROPERTY_PHOTO_BYTES,
  MAX_PROPERTY_PHOTOS,
  PROPERTY_PHOTO_FIELD_NAME,
} from '../property-photos/property-photo.constants';
import { PropertyPhotosService } from '../property-photos/property-photos.service';
import { ReorderPropertyPhotosDto } from '../property-photos/dto/reorder-property-photos.dto';
import { UpdatePropertyPhotoDto } from '../property-photos/dto/update-property-photo.dto';
import { PropertyPhotoResponseDto } from '../properties/dto/property-response.dto';

@ApiTags('Reviewer-created property photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.REVIEWER)
@Controller('reviewer/properties/:id/photos')
export class ReviewerPropertyPhotosController {
  constructor(private readonly photos: PropertyPhotosService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor(PROPERTY_PHOTO_FIELD_NAME, MAX_PROPERTY_PHOTOS, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_PROPERTY_PHOTO_BYTES,
        files: MAX_PROPERTY_PHOTOS,
      },
    }),
  )
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.upload(user.id, propertyId, files ?? []);
  }

  @Patch('reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() input: ReorderPropertyPhotosDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.reorder(user.id, propertyId, input);
  }

  @Patch(':photoId/cover')
  setCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.setCover(user.id, propertyId, photoId);
  }

  @Patch(':photoId')
  updateAltText(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body() input: UpdatePropertyPhotoDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.updateAltText(user.id, propertyId, photoId, input);
  }

  @Delete(':photoId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.remove(user.id, propertyId, photoId);
  }
}
