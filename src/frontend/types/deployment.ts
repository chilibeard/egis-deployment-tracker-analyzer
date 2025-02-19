export type DeploymentStatus = 'in_progress' | 'completed' | 'failed'
export type PhaseStatus = 'in_progress' | 'completed' | 'failed'

export interface DeploymentSummary {
  machine_name: string
  deployment_status: DeploymentStatus
  error_count: number
  warning_count: number
  phase_statuses: Record<string, PhaseStatus>
  start_time: string
}
