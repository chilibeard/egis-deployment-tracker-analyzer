import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { UploadLogsDto } from './dto/upload-logs.dto';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload log files for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Log files to process',
    type: UploadLogsDto,
  })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadLogs(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadLogsDto,
  ) {
    return this.logsService.processLogs(files, body.deploymentId);
  }

  @Get(':deploymentId')
  @ApiOperation({ summary: 'Get all logs for a deployment' })
  async getLogs(@Param('deploymentId', ParseUUIDPipe) deploymentId: string) {
    return this.logsService.getLogsByDeploymentId(deploymentId);
  }

  @Get(':deploymentId/errors')
  @ApiOperation({ summary: 'Get all errors for a deployment' })
  async getErrors(@Param('deploymentId', ParseUUIDPipe) deploymentId: string) {
    return this.logsService.getErrorsByDeploymentId(deploymentId);
  }

  @Get(':deploymentId/timeline')
  @ApiOperation({ summary: 'Get deployment timeline' })
  async getTimeline(@Param('deploymentId', ParseUUIDPipe) deploymentId: string) {
    return this.logsService.getDeploymentTimeline(deploymentId);
  }
}
