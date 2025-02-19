import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsModule } from './logs/logs.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { DatabaseModule } from './database/database.module';
import { ProcessingModule } from './processing/processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    LogsModule,
    DeploymentsModule,
    ProcessingModule,
  ],
})
export class AppModule {}
