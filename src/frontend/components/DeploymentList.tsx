'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DeploymentSummary, DeploymentStatus, PhaseStatus } from '../types/deployment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function DeploymentList() {
  const queryClient = useQueryClient()
  const { data: deployments, isLoading } = useQuery<DeploymentSummary[]>({
    queryKey: ['deployments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_status_summary')
        .select('*')
        .order('start_time', { ascending: false })
      
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('deployment_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployments',
        },
        () => {
          // Invalidate and refetch deployments query
          void queryClient.invalidateQueries({ queryKey: ['deployments'] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  if (isLoading) {
    return <div>Loading deployments...</div>
  }

  return (
    <div className="grid gap-4">
      {deployments?.map((deployment) => (
        <div
          key={deployment.machine_name}
          className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{deployment.machine_name}</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                deployment.deployment_status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : deployment.deployment_status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {deployment.deployment_status}
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Errors</p>
              <p className="font-medium">{deployment.error_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Warnings</p>
              <p className="font-medium">{deployment.warning_count}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Phase Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(deployment.phase_statuses).map(([phase, status]) => (
                <div
                  key={phase}
                  className="text-sm flex justify-between items-center bg-gray-50 p-2 rounded"
                >
                  <span className="capitalize">{phase.replace(/_/g, ' ')}</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
