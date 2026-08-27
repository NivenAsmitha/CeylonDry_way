import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PROPERTY_PHOTO_STORAGE } from './property-photo.constants';
import type { PropertyPhotoStorage } from './property-photo-storage';

@ApiTags('Property photo media')
@Controller('media/property-photos')
export class PropertyPhotoMediaController {
  constructor(
    @Inject(PROPERTY_PHOTO_STORAGE)
    private readonly storage: PropertyPhotoStorage,
  ) {}

  @Get(':storageKey')
  @ApiOkResponse({ description: 'Development property-photo image' })
  @ApiNotFoundResponse({ description: 'Photo not found' })
  async getLocalPhoto(
    @Param('storageKey') storageKey: string,
  ): Promise<StreamableFile> {
    if (!this.storage.readLocalPropertyPhoto) {
      throw new NotFoundException('Photo not found');
    }
    const file = await this.storage.readLocalPropertyPhoto(storageKey);
    if (!file) throw new NotFoundException('Photo not found');

    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: 'inline',
    });
  }
}
