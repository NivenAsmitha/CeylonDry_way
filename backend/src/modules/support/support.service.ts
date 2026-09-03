import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  SupportTicketStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import type { SupportMessageDto } from './dto/support-message.dto';
import type { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import type { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';

const ticketListSelect = {
  id: true,
  ticketNumber: true,
  category: true,
  priority: true,
  status: true,
  subject: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedReviewer: { select: { id: true, name: true } },
  relatedProperty: {
    select: { id: true, activeVersion: { select: { name: true } } },
  },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketSelect;

const ticketDetailSelect = {
  ...ticketListSelect,
  messages: {
    where: { isStaffNote: false },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      message: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  },
} satisfies Prisma.SupportTicketSelect;

function mapTicket<
  T extends {
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    messages?: Array<{ createdAt: Date }>;
  },
>(ticket: T) {
  return {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    ...(ticket.messages
      ? {
          messages: ticket.messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateSupportTicketDto) {
    if (input.relatedPropertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: input.relatedPropertyId },
        select: { id: true },
      });
      if (!property) throw new NotFoundException('Related property not found');
    }

    const ticket = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.supportTicket.create({
        data: {
          createdById: userId,
          category: input.category,
          priority: input.priority,
          subject: input.subject,
          relatedPropertyId: input.relatedPropertyId ?? null,
          messages: {
            create: { authorId: userId, message: input.message },
          },
        },
        select: ticketDetailSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: 'SUPPORT_TICKET_CREATED',
          targetType: 'SUPPORT_TICKET',
          targetId: created.id,
          afterSummary: {
            ticketNumber: created.ticketNumber,
            category: created.category,
            priority: created.priority,
          },
        },
      });
      return created;
    });
    return mapTicket(ticket);
  }

  async listMine(userId: string, query: SupportTicketQueryDto) {
    return this.list({ createdById: userId }, query);
  }

  async getMine(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, createdById: userId },
      select: ticketDetailSelect,
    });
    if (!ticket) throw new NotFoundException('Support request not found');
    return mapTicket(ticket);
  }

  async addClientMessage(
    userId: string,
    ticketId: string,
    input: SupportMessageDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findFirst({
        where: { id: ticketId, createdById: userId },
        select: {
          id: true,
          status: true,
          assignedReviewerId: true,
          ticketNumber: true,
        },
      });
      if (!ticket) throw new NotFoundException('Support request not found');
      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ConflictException(
          'Closed support requests cannot receive messages',
        );
      }
      const message = await transaction.supportMessage.create({
        data: { ticketId, authorId: userId, message: input.message },
        select: { id: true, message: true, createdAt: true },
      });
      await transaction.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: ticket.assignedReviewerId
            ? SupportTicketStatus.WAITING_FOR_STAFF
            : SupportTicketStatus.OPEN,
          closedAt: null,
        },
      });
      if (ticket.assignedReviewerId) {
        await transaction.notification.create({
          data: {
            recipientId: ticket.assignedReviewerId,
            type: NotificationType.SUPPORT_TICKET_REPLY,
            payload: { ticketId, ticketNumber: ticket.ticketNumber },
          },
        });
      }
      return { ...message, createdAt: message.createdAt.toISOString() };
    });
  }

  async closeMine(userId: string, ticketId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findFirst({
        where: { id: ticketId, createdById: userId },
        select: { id: true, status: true },
      });
      if (!ticket) throw new NotFoundException('Support request not found');
      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ConflictException('Support request is already closed');
      }
      await transaction.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.CLOSED, closedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: 'SUPPORT_TICKET_CLOSED_BY_CLIENT',
          targetType: 'SUPPORT_TICKET',
          targetId: ticketId,
          beforeSummary: { status: ticket.status },
          afterSummary: { status: SupportTicketStatus.CLOSED },
        },
      });
      return { id: ticketId, status: SupportTicketStatus.CLOSED };
    });
  }

  async listStaff(query: SupportTicketQueryDto) {
    return this.list({}, query);
  }

  async getStaff(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: ticketDetailSelect,
    });
    if (!ticket) throw new NotFoundException('Support request not found');
    return mapTicket(ticket);
  }

  async claim(actorId: string, ticketId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          assignedReviewerId: true,
          createdById: true,
        },
      });
      if (!ticket) throw new NotFoundException('Support request not found');
      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ConflictException(
          'Closed support requests cannot be assigned',
        );
      }
      await transaction.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedReviewerId: actorId,
          status:
            ticket.status === SupportTicketStatus.OPEN
              ? SupportTicketStatus.ASSIGNED
              : ticket.status,
        },
      });
      await Promise.all([
        transaction.auditLog.create({
          data: {
            actorId,
            action: 'SUPPORT_TICKET_ASSIGNED',
            targetType: 'SUPPORT_TICKET',
            targetId: ticketId,
            beforeSummary: { assignedReviewerId: ticket.assignedReviewerId },
            afterSummary: { assignedReviewerId: actorId },
          },
        }),
        transaction.notification.create({
          data: {
            recipientId: ticket.createdById,
            type: NotificationType.SUPPORT_TICKET_ASSIGNED,
            payload: { ticketId, ticketNumber: ticket.ticketNumber },
          },
        }),
      ]);
      return { id: ticketId, assignedReviewerId: actorId };
    });
  }

  async addStaffMessage(
    actorId: string,
    ticketId: string,
    input: SupportMessageDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          createdById: true,
          assignedReviewerId: true,
        },
      });
      if (!ticket) throw new NotFoundException('Support request not found');
      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ConflictException(
          'Closed support requests cannot receive replies',
        );
      }
      const message = await transaction.supportMessage.create({
        data: { ticketId, authorId: actorId, message: input.message },
        select: { id: true, message: true, createdAt: true },
      });
      await transaction.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedReviewerId: ticket.assignedReviewerId ?? actorId,
          status: SupportTicketStatus.WAITING_FOR_CLIENT,
          closedAt: null,
        },
      });
      await transaction.notification.create({
        data: {
          recipientId: ticket.createdById,
          type: NotificationType.SUPPORT_TICKET_REPLY,
          payload: { ticketId, ticketNumber: ticket.ticketNumber },
        },
      });
      return { ...message, createdAt: message.createdAt.toISOString() };
    });
  }

  async updateStatus(
    actorId: string,
    ticketId: string,
    input: UpdateSupportTicketStatusDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          status: true,
          assignedReviewerId: true,
          createdById: true,
          ticketNumber: true,
        },
      });
      if (!ticket) throw new NotFoundException('Support request not found');
      if (ticket.status === input.status) {
        throw new ConflictException(
          `Support request is already ${input.status}`,
        );
      }
      await transaction.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: input.status,
          assignedReviewerId: ticket.assignedReviewerId ?? actorId,
          closedAt:
            input.status === SupportTicketStatus.CLOSED ? new Date() : null,
        },
      });
      await Promise.all([
        transaction.auditLog.create({
          data: {
            actorId,
            action: 'SUPPORT_TICKET_STATUS_CHANGED',
            targetType: 'SUPPORT_TICKET',
            targetId: ticketId,
            beforeSummary: { status: ticket.status },
            afterSummary: { status: input.status, reason: input.reason },
          },
        }),
        transaction.notification.create({
          data: {
            recipientId: ticket.createdById,
            type: NotificationType.SUPPORT_TICKET_REPLY,
            payload: {
              ticketId,
              ticketNumber: ticket.ticketNumber,
              status: input.status,
            },
          },
        }),
      ]);
      return { id: ticketId, status: input.status };
    });
  }

  private async list(
    baseWhere: Prisma.SupportTicketWhereInput,
    query: SupportTicketQueryDto,
  ) {
    const where: Prisma.SupportTicketWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' } },
              {
                createdBy: {
                  is: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                createdBy: {
                  is: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: ticketListSelect,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items: items.map(mapTicket),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
