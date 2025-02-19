import { ApiProperty } from '@nestjs/swagger';

export class UploadLogsDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Deployment logs zip file' })
  file: Express.Multer.File;
}
