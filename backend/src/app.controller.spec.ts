import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            role: {
              count: jest.fn().mockResolvedValue(5),
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should report API and database health', async () => {
      await expect(appController.getHealth()).resolves.toMatchObject({
        status: 'ok',
        service: 'ceylon-dryway-api',
        database: {
          status: 'connected',
          seededRoleCount: 5,
        },
      });
    });
  });
});
