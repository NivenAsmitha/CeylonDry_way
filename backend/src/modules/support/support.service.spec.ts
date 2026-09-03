import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportService } from './support.service';

describe('SupportService', () => {
  const supportTicket = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const supportMessage = { create: jest.fn() };
  const auditLog = { create: jest.fn() };
  const notification = { create: jest.fn() };
  const property = { findUnique: jest.fn() };
  const transaction = {
    supportTicket,
    supportMessage,
    auditLog,
    notification,
  };
  const prisma = {
    property,
    supportTicket,
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;
  const service = new SupportService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a private ticket with the first client message and audit entry', async () => {
    const now = new Date('2026-09-02T10:00:00.000Z');
    supportTicket.create.mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 12,
      category: SupportTicketCategory.TECHNICAL,
      priority: SupportTicketPriority.NORMAL,
      status: SupportTicketStatus.OPEN,
      subject: 'Map does not load',
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      createdBy: { id: 'user-1', name: 'Client', email: 'client@test.com' },
      assignedReviewer: null,
      relatedProperty: null,
      _count: { messages: 1 },
      messages: [
        {
          id: 'message-1',
          message: 'The map does not load on my phone.',
          createdAt: now,
          author: { id: 'user-1', name: 'Client', roles: [] },
        },
      ],
    });

    const result = await service.create('user-1', {
      category: SupportTicketCategory.TECHNICAL,
      priority: SupportTicketPriority.NORMAL,
      subject: 'Map does not load',
      message: 'The map does not load on my phone.',
    });

    expect(result).toMatchObject({
      id: 'ticket-1',
      ticketNumber: 12,
      createdAt: now.toISOString(),
    });
    expect(supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped at this boundary.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          createdById: 'user-1',
          messages: {
            create: {
              authorId: 'user-1',
              message: 'The map does not load on my phone.',
            },
          },
        }),
      }),
    );
    expect(auditLog.create).toHaveBeenCalled();
  });

  it('does not reveal another client support request', async () => {
    supportTicket.findFirst.mockResolvedValue(null);

    await expect(service.getMine('user-1', 'ticket-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(supportTicket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-2', createdById: 'user-1' },
      }),
    );
  });

  it('prevents messages being added to a closed client request', async () => {
    supportTicket.findFirst.mockResolvedValue({
      id: 'ticket-1',
      status: SupportTicketStatus.CLOSED,
      assignedReviewerId: 'reviewer-1',
      ticketNumber: 12,
    });

    await expect(
      service.addClientMessage('user-1', 'ticket-1', {
        message: 'More details',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(supportMessage.create).not.toHaveBeenCalled();
  });

  it('records a staff reply, assigns the handler, and notifies the client', async () => {
    const now = new Date('2026-09-02T11:00:00.000Z');
    supportTicket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 12,
      status: SupportTicketStatus.OPEN,
      createdById: 'user-1',
      assignedReviewerId: null,
    });
    supportMessage.create.mockResolvedValue({
      id: 'message-2',
      message: 'We are checking the map configuration.',
      createdAt: now,
    });

    await expect(
      service.addStaffMessage('reviewer-1', 'ticket-1', {
        message: 'We are checking the map configuration.',
      }),
    ).resolves.toMatchObject({ id: 'message-2', createdAt: now.toISOString() });
    expect(supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          assignedReviewerId: 'reviewer-1',
          status: SupportTicketStatus.WAITING_FOR_CLIENT,
        }),
      }),
    );
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ recipientId: 'user-1' }),
      }),
    );
  });
});
