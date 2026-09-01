import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { environmentValidationSchema } from './config/env.validation';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { PlacesModule } from './modules/places/places.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ReviewerModule } from './modules/reviewer/reviewer.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { UsersModule } from './modules/users/users.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    DeveloperModule,
    PlacesModule,
    UsersModule,
    UserManagementModule,
    PropertiesModule,
    ReviewerModule,
    ReportsModule,
    RatingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
