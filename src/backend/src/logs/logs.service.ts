import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { ProcessingService } from '../processing/processing.service';
import * as AdmZip from 'adm-zip';

@Injectable()
export class LogsService {
  private readonly supabase;
  private readonly logger = new Logger(LogsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly processingService: ProcessingService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY')
    );
  }

  async processDeploymentLogs(machineName: string, file: Express.Multer.File) {
    try {
      // 1. Create deployment record
      const { data: deployment, error: deploymentError } = await this.supabase
        .from('deployments')
        .insert({
          machine_name: machineName,
          status: 'processing',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (deploymentError) throw deploymentError;

      // 2. Extract zip contents
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();

      // 3. Upload each file to Supabase Storage
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const { error: uploadError } = await this.supabase.storage
            .from('deployment-logs')
            .upload(
              `${machineName}/${entry.entryName}`,
              entry.getData(),
              {
                contentType: 'application/octet-stream',
              }
            );

          if (uploadError) throw uploadError;
        }
      }

      // 4. Queue files for processing
      await this.processingService.queueDeploymentForProcessing(deployment.id, machineName);

      return { 
        deploymentId: deployment.id,
        status: 'queued',
        message: 'Deployment logs uploaded and queued for processing'
      };
    } catch (error) {
      this.logger.error(`Error processing deployment logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDeploymentLogs(deploymentId: string) {
    const { data, error } = await this.supabase
      .from('deployment_status_summary')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (error) throw error;
    return data;
  }
}
