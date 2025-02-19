import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray } from 'class-validator';

export class UploadLogsDto {
  @ApiProperty({
    description: 'The deployment ID to associate the logs with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  deploymentId: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Log files to process',
  })
  @IsArray()
  files: Express.Multer.File[];
}
