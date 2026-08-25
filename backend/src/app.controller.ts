import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService, HealthResponse } from './app.service';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiOkResponse({
    description: 'The API is running and the database is connected.',
    schema: {
      example: {
        status: 'ok',
        service: 'ceylon-dryway-api',
        database: {
          status: 'connected',
          seededRoleCount: 5,
        },
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  async getHealth(): Promise<HealthResponse> {
    return this.appService.getHealth();
  }
}
