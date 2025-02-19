import { DatabaseService } from '../lib/db/DatabaseService';
import { LogProcessor } from '../lib/processing/LogProcessor';
import { ProcessingTask } from '../lib/processing/types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

async function processDeploymentLogs(
  deploymentFolder: string,
  machineName: string
) {
  // Initialize services
  const db = new DatabaseService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  const processor = new LogProcessor(db);

  try {
    // Create new deployment
    const deploymentId = await db.createDeployment(machineName);
    console.log(`Created deployment ${deploymentId} for machine ${machineName}`);

    // Create phases
    const phases = {
      initial_setup: await db.createPhase(deploymentId, 'initial_setup'),
      device_enrollment: await db.createPhase(deploymentId, 'device_enrollment'),
      software_deployment: await db.createPhase(deploymentId, 'software_deployment'),
      configuration: await db.createPhase(deploymentId, 'configuration'),
      validation: await db.createPhase(deploymentId, 'validation')
    };

    // Subscribe to deployment updates
    const unsubscribe = db.subscribeToDeploymentUpdates(deploymentId, (update) => {
      console.log(`Deployment ${deploymentId} status updated:`, update.new.status);
    });

    // Example tasks for different log types
    const tasks: ProcessingTask[] = [
      // Installation logs (high priority)
      {
        id: uuidv4(),
        deploymentId,
        phaseId: phases.software_deployment,
        filePath: path.join(deploymentFolder, 'Logs-Install_FortiClientVPN_7.4.0.1658.log'),
        fileType: 'installation',
        priority: 'high',
        status: 'pending',
        createdAt: new Date()
      },
      // Event logs (medium priority)
      {
        id: uuidv4(),
        deploymentId,
        phaseId: phases.device_enrollment,
        filePath: path.join(deploymentFolder, 'microsoft-windows-devicemanagement-enterprise-diagnostics-provider-admin.evtx'),
        fileType: 'event',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      },
      // Configuration logs (medium priority)
      {
        id: uuidv4(),
        deploymentId,
        phaseId: phases.configuration,
        filePath: path.join(deploymentFolder, 'Logs-CreateTask_AutopilotStartup.log'),
        fileType: 'configuration',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      }
    ];

    // Add tasks to processor
    for (const task of tasks) {
      await processor.addTask(task);
    }

    // Start processing
    processor.start();

    // Monitor progress
    const monitorInterval = setInterval(() => {
      const metrics = processor.getMetrics();
      console.log('Processing metrics:', metrics);

      // Stop monitoring when all tasks are processed
      if (metrics.processingCount === 0 && 
          metrics.highPriorityCount === 0 &&
          metrics.mediumPriorityCount === 0 &&
          metrics.lowPriorityCount === 0) {
        clearInterval(monitorInterval);
        processor.stop();
        unsubscribe();
        console.log('Processing completed');
      }
    }, 5000);

  } catch (error) {
    console.error('Error processing deployment logs:', error);
    processor.stop();
  }
}

// Usage example
if (require.main === module) {
  const deploymentFolder = process.env.DEPLOYMENT_FOLDER || 'EG-B24XLYMTV1D9';
  const machineName = path.basename(deploymentFolder);

  processDeploymentLogs(deploymentFolder, machineName)
    .catch(console.error);
}
