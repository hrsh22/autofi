export function downloadBytes(bytes: Uint8Array, filename: string) {
  const copy = bytes.slice()
  const blob = new Blob([copy.buffer])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}


