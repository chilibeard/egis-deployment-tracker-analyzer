import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { DatabaseModule } from '../database/database.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [DatabaseModule, ProcessingModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
