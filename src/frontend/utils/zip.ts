import JSZip from 'jszip'

export async function extractZip(file: File): Promise<Map<string, ArrayBuffer>> {
  const zip = new JSZip()
  const contents = await zip.loadAsync(file)
  const files = new Map<string, ArrayBuffer>()

  for (const [path, zipEntry] of Object.entries(contents.files)) {
    if (!zipEntry.dir) {
      const content = await zipEntry.async('arraybuffer')
      files.set(path, content)
    }
  }

  return files
}
