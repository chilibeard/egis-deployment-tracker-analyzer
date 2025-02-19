'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { extractZip } from '../utils/zip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function LogUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)

      // Extract machine name from zip filename (e.g., "EG-B24XLYMTV1D9.zip")
      const machineName = file.name.replace('.zip', '')

      // 1. Create deployment record
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .insert({
          machine_name: machineName,
          status: 'processing',
          start_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (deploymentError) throw deploymentError

      // 2. Extract and process zip contents
      const files = await extractZip(file)

      // 3. Upload each file to Supabase Storage
      const entries = Array.from(files.entries())
      for (const [path, content] of entries) {
        const { error: uploadError } = await supabase.storage
          .from('deployment-logs')
          .upload(`${machineName}/${path}`, content, {
            contentType: 'application/octet-stream',
          })

        if (uploadError) throw uploadError
      }

      // 4. Update deployment status
      await supabase
        .from('deployments')
        .update({ status: 'uploaded' })
        .eq('machine_name', machineName)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logs')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <label
        className={`
          flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer
          hover:border-gray-400 focus:outline-none
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="font-medium text-gray-600">
            {isUploading ? 'Uploading...' : 'Drop deployment logs or click to upload'}
          </span>
        </span>
        <input
          type="file"
          name="file"
          className="hidden"
          accept=".zip"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </label>

      {error && (
        <div className="mt-4 p-3 text-sm text-red-500 bg-red-50 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
