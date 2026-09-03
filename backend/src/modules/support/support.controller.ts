import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportMessageDto } from './dto/support-message.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { SupportService } from './support.service';

@ApiTags('Client support')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'CLIENT role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.CLIENT)
@Controller('support/tickets')
export class ClientSupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ support: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateSupportTicketDto,
  ) {
    return this.support.create(user.id, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SupportTicketQueryDto,
  ) {
    return this.support.listMine(user.id, query);
  }

  @Get(':ticketId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.support.getMine(user.id, ticketId);
  }

  @Post(':ticketId/messages')
  @UseGuards(ThrottlerGuard)
  @Throttle({ support: { limit: 20, ttl: 60_000 } })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() input: SupportMessageDto,
  ) {
    return this.support.addClientMessage(user.id, ticketId, input);
  }

  @Patch(':ticketId/close')
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.support.closeMine(user.id, ticketId);
  }
}

@ApiTags('Staff support')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'REVIEWER or ADMIN role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.REVIEWER, RoleName.ADMIN)
@Controller('staff/support/tickets')
export class StaffSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@Query() query: SupportTicketQueryDto) {
    return this.support.listStaff(query);
  }

  @Get(':ticketId')
  detail(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.support.getStaff(ticketId);
  }

  @Patch(':ticketId/claim')
  claim(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.support.claim(user.id, ticketId);
  }

  @Post(':ticketId/messages')
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() input: SupportMessageDto,
  ) {
    return this.support.addStaffMessage(user.id, ticketId, input);
  }

  @Patch(':ticketId/status')
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() input: UpdateSupportTicketStatusDto,
  ) {
    return this.support.updateStatus(user.id, ticketId, input);
  }
}
