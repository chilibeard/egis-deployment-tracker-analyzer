'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { formatDate, getStatusColor } from '@/lib/utils';
import type { DeploymentSummary } from '@/types/deployment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DeploymentList() {
  const queryClient = useQueryClient();

  const { data: deployments, isLoading, error } = useQuery<DeploymentSummary[]>({
    queryKey: ['deployments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_status_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('deployments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployment_status_summary',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['deployments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600">Error loading deployments: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {deployments?.map((deployment) => (
        <Link
          key={deployment.id}
          href={`/deployments/${deployment.id}`}
          className="block p-4 border rounded-lg hover:border-blue-500 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{deployment.machine_name}</h3>
              <p className="text-sm text-gray-500">
                Started {formatDate(deployment.start_time)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className={`px-2 py-1 text-sm rounded ${getStatusColor(
                  deployment.status
                )}`}
              >
                {deployment.status}
              </span>
              <div className="text-sm text-gray-500">
                <p>{deployment.error_count} errors</p>
                <p>{deployment.warning_count} warnings</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
      {deployments?.length === 0 && (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-gray-500">No deployments found</p>
        </div>
      )}
    </div>
  );
}
