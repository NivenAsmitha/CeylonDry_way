import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PlaceListQueryDto } from './dto/place-list-query.dto';
import {
  PublicPlaceDetailsDto,
  PublicPlaceListResponseDto,
} from './dto/place-response.dto';
import { PlacesService } from './places.service';

@ApiTags('Public places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({
    summary: 'Search approved active facilities without authentication',
  })
  @ApiOkResponse({ type: PublicPlaceListResponseDto })
  @ApiBadRequestResponse({ description: 'Public place query is invalid' })
  listPlaces(
    @Query() query: PlaceListQueryDto,
  ): Promise<PublicPlaceListResponseDto> {
    return this.placesService.listPlaces(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one approved active facility' })
  @ApiOkResponse({ type: PublicPlaceDetailsDto })
  @ApiNotFoundResponse({ description: 'Place not found' })
  getPlace(
    @Param('id', new ParseUUIDPipe()) propertyId: string,
  ): Promise<PublicPlaceDetailsDto> {
    return this.placesService.getPlace(propertyId);
  }
}
