import { Suspense } from 'react';
import DeploymentList from '@/components/DeploymentList';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Deployments | Egis Log Analyzer',
  description: 'View and analyze deployment logs',
};

export default function DeploymentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Deployments</h1>
      </div>
      
      <div className="space-y-4">
        <Suspense fallback={<DeploymentListSkeleton />}>
          <DeploymentList />
        </Suspense>
      </div>
    </div>
  );
}

function DeploymentListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
