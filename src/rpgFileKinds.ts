export type FileItemKind = 'folder' | 'image' | 'doc' | 'archive' | 'video' | 'audio' | 'code' | 'other'

export function fileItemKind(ext: string, isDirectory: boolean): FileItemKind {
  if (isDirectory) return 'folder'
  const e = ext.replace(/^\./, '').toLowerCase()
  const images = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'heic', 'avif']
  const documents = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'odt', 'ods', 'csv']
  const archives = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
  const video = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'm4v']
  const audio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']
  const code = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'rs', 'go', 'html', 'css', 'json', 'vue', 'svelte']
  if (images.includes(e)) return 'image'
  if (documents.includes(e)) return 'doc'
  if (archives.includes(e)) return 'archive'
  if (video.includes(e)) return 'video'
  if (audio.includes(e)) return 'audio'
  if (code.includes(e)) return 'code'
  return 'other'
}
