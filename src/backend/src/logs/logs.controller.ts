import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { UploadLogsDto } from './dto/upload-logs.dto';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload deployment logs zip file for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Deployment logs zip file',
    type: UploadLogsDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogs(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB max
          new FileTypeValidator({ fileType: 'application/zip' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadLogsDto,
  ) {
    const machineName = file.originalname.replace('.zip', '');
    return this.logsService.processDeploymentLogs(machineName, file);
  }

  @Get(':deploymentId')
  @ApiOperation({ summary: 'Get deployment logs by ID' })
  async getDeploymentLogs(@Param('deploymentId', ParseUUIDPipe) deploymentId: string) {
    return this.logsService.getDeploymentLogs(deploymentId);
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
