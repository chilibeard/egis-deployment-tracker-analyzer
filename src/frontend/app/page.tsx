import { DeploymentList } from '@/components/DeploymentList'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Deployment Log Analyzer</h1>
      <DeploymentList />
    </main>
  )
}
