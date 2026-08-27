import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PropertyPhotoResponseDto } from '../properties/dto/property-response.dto';
import { ReorderPropertyPhotosDto } from './dto/reorder-property-photos.dto';
import { UpdatePropertyPhotoDto } from './dto/update-property-photo.dto';
import {
  MAX_PROPERTY_PHOTO_BYTES,
  MAX_PROPERTY_PHOTOS,
  PROPERTY_PHOTO_FIELD_NAME,
} from './property-photo.constants';
import { PropertyPhotosService } from './property-photos.service';

@ApiTags('Owner property photos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiNotFoundResponse({ description: 'Owned property or photo not found' })
@ApiConflictResponse({ description: 'Property version is not owner-editable' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.OWNER)
@Controller('owner/properties/:id/photos')
export class PropertyPhotosController {
  constructor(private readonly photos: PropertyPhotosService) {}

  @Post()
  @ApiOperation({ summary: 'Upload 1 to 4 validated property photos' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [PROPERTY_PHOTO_FIELD_NAME],
      properties: {
        [PROPERTY_PHOTO_FIELD_NAME]: {
          type: 'array',
          maxItems: MAX_PROPERTY_PHOTOS,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  @ApiBadRequestResponse({ description: 'Photo count or content is invalid' })
  @UseInterceptors(
    FilesInterceptor(PROPERTY_PHOTO_FIELD_NAME, MAX_PROPERTY_PHOTOS, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_PROPERTY_PHOTO_BYTES,
        files: MAX_PROPERTY_PHOTOS,
      },
    }),
  )
  upload(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.upload(currentUser.id, propertyId, files ?? []);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Atomically reorder every current property photo' })
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  reorder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() input: ReorderPropertyPhotosDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.reorder(currentUser.id, propertyId, input);
  }

  @Patch(':photoId/cover')
  @ApiOperation({ summary: 'Set the only cover photo atomically' })
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  setCover(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.setCover(currentUser.id, propertyId, photoId);
  }

  @Patch(':photoId')
  @ApiOperation({ summary: 'Update concise property-photo alt text' })
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  updateAltText(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body() input: UpdatePropertyPhotoDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.updateAltText(
      currentUser.id,
      propertyId,
      photoId,
      input,
    );
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a photo and promote a new cover if needed' })
  @ApiOkResponse({ type: [PropertyPhotoResponseDto] })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.photos.remove(currentUser.id, propertyId, photoId);
  }
}
