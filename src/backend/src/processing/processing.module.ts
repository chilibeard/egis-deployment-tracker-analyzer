import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
