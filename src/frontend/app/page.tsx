import { DeploymentList } from '../components/DeploymentList'
import { LogUpload } from '../components/LogUpload'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Deployment Log Analyzer</h1>
      <div className="mb-8">
        <LogUpload />
      </div>
      <DeploymentList />
    </main>
  )
}
