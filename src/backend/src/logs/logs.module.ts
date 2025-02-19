import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [ConfigModule, ProcessingModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
