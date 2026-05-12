import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SORT_ROOT_NAME = 'DungeonSorted'

type DownloadFileRow = {
  name: string
  size: number
  mtimeMs: number
  atimeMs: number
}

function categoryForExt(ext: string): string {
  const e = ext.replace(/^\./, '').toLowerCase()
  const images = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'heic', 'avif']
  const documents = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'odt', 'ods', 'csv']
  const archives = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
  const video = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'm4v']
  const audio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']
  const code = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'rs', 'go', 'html', 'css', 'json', 'vue', 'svelte']
  if (images.includes(e)) return 'Images'
  if (documents.includes(e)) return 'Documents'
  if (archives.includes(e)) return 'Archives'
  if (video.includes(e)) return 'Video'
  if (audio.includes(e)) return 'Audio'
  if (code.includes(e)) return 'Code'
  return 'Other'
}

async function uniqueDestPath(destPath: string): Promise<string> {
  try { await fs.access(destPath) }
  catch { return destPath }
  const dir = path.dirname(destPath)
  const base = path.basename(destPath)
  const ext = path.extname(base)
  const stem = ext ? base.slice(0, -ext.length) : base
  let n = 1
  for (;;) {
    const candidate = path.join(dir, `${stem} (${n})${ext}`)
    try { await fs.access(candidate); n++ }
    catch { return candidate }
  }
}

function tempPatternMatched(name: string): boolean {
  const lowered = name.toLowerCase()
  if (lowered.startsWith('~$')) return true
  return (
    lowered.endsWith('.tmp') || lowered.endsWith('.temp') ||
    lowered.endsWith('.part') || lowered.endsWith('.crdownload') ||
    lowered.endsWith('.download') || lowered.endsWith('.bak')
  )
}

function recommendationScore(file: DownloadFileRow, nowMs: number): { score: number, reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const dayMs = 24 * 60 * 60 * 1000
  const idleDays = (nowMs - file.atimeMs) / dayMs

  if (idleDays >= 30) {
    const staleBonus = Math.min(35, Math.floor((idleDays - 30) / 7) * 3)
    score += 40 + staleBonus
    reasons.push(`${Math.floor(idleDays)}일 미접근`)
  }
  if (file.size >= 500 * 1024 * 1024) { score += 36; reasons.push('대용량(500MB+)') }
  else if (file.size >= 100 * 1024 * 1024) { score += 24; reasons.push('중대용량(100MB+)') }
  else if (file.size >= 25 * 1024 * 1024) { score += 12; reasons.push('용량 큼(25MB+)') }
  if (tempPatternMatched(file.name)) { score += 45; reasons.push('임시파일 패턴') }

  return { score, reasons }
}

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL)
  else win.loadFile(path.join(RENDERER_DIST, 'index.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function registerDungeonIpc() {
  ipcMain.handle('dungeon:analyzeDownloads', async () => {
    const root = app.getPath('downloads')
    const entries = await fs.readdir(root, { withFileTypes: true })
    const files: DownloadFileRow[] = []

    for (const dirent of entries) {
      if (!dirent.isFile()) continue
      if (dirent.name.startsWith('.')) continue
      const fullPath = path.join(root, dirent.name)
      const st = await fs.stat(fullPath)
      files.push({ name: dirent.name, size: st.size, mtimeMs: st.mtimeMs, atimeMs: st.atimeMs })
    }

    const duplicateMap = new Map<string, DownloadFileRow[]>()
    for (const file of files) {
      const key = `${file.name.toLowerCase()}::${file.size}`
      const prev = duplicateMap.get(key)
      if (prev) prev.push(file)
      else duplicateMap.set(key, [file])
    }

    const duplicateGroups = Array.from(duplicateMap.values())
      .filter(group => group.length > 1)
      .map(group => ({ name: group[0].name, size: group[0].size, count: group.length, files: group.map(x => x.name) }))
      .sort((a, b) => (b.count - a.count) || (b.size - a.size) || a.name.localeCompare(b.name))

    const nowMs = Date.now()
    const recommendations = files
      .map(file => { const s = recommendationScore(file, nowMs); return { name: file.name, size: file.size, atimeMs: file.atimeMs, score: s.score, reasons: s.reasons } })
      .filter(x => x.score >= 35)
      .sort((a, b) => (b.score - a.score) || (b.size - a.size) || a.name.localeCompare(b.name))
      .slice(0, 20)

    return { root, duplicateGroups, recommendations, scannedFileCount: files.length }
  })

  ipcMain.handle('dungeon:scanDownloads', async () => {
    const root = app.getPath('downloads')
    const entries = await fs.readdir(root, { withFileTypes: true })
    const items: { name: string; isDirectory: boolean; ext: string; size: number; mtimeMs: number }[] = []

    for (const dirent of entries) {
      const fullPath = path.join(root, dirent.name)
      if (dirent.isDirectory()) {
        if (dirent.name === SORT_ROOT_NAME) continue
        const st = await fs.stat(fullPath)
        items.push({ name: dirent.name, isDirectory: true, ext: '', size: 0, mtimeMs: st.mtimeMs })
        continue
      }
      if (!dirent.isFile()) continue
      const st = await fs.stat(fullPath)
      items.push({ name: dirent.name, isDirectory: false, ext: path.extname(dirent.name), size: st.size, mtimeMs: st.mtimeMs })
    }

    return { root, items }
  })

  ipcMain.handle('dungeon:organizeDownloads', async () => {
    const root = app.getPath('downloads')
    const sortedBase = path.join(root, SORT_ROOT_NAME)
    await fs.mkdir(sortedBase, { recursive: true })

    const entries = await fs.readdir(root, { withFileTypes: true })
    let moved = 0
    const moves: string[] = []
    const failed: string[] = []

    for (const dirent of entries) {
      if (!dirent.isFile()) continue
      if (dirent.name.startsWith('.')) continue
      const category = categoryForExt(path.extname(dirent.name))
      const destDir = path.join(sortedBase, category)
      await fs.mkdir(destDir, { recursive: true })
      const srcPath = path.join(root, dirent.name)
      let destPath = path.join(destDir, dirent.name)
      destPath = await uniqueDestPath(destPath)
      try { await fs.rename(srcPath, destPath); moved++; moves.push(dirent.name) }
      catch { failed.push(dirent.name) }
    }

    return { moved, moves, failed }
  })

  // 새로 추가: 선택 파일 삭제
  ipcMain.handle('dungeon:deleteFiles', async (_event, fileNames: string[]) => {
    const root = app.getPath('downloads')
    let deleted = 0
    const failed: string[] = []

    for (const name of fileNames) {
      // 보안: 파일명에 경로 구분자 없는지 확인
      if (name.includes('/') || name.includes('\\') || name.includes('..')) {
        failed.push(name)
        continue
      }
      const fullPath = path.join(root, name)
      // 보안: 반드시 downloads 폴더 안에 있는지 확인
      if (!fullPath.startsWith(root)) {
        failed.push(name)
        continue
      }
      try {
        await fs.unlink(fullPath)
        deleted++
      } catch {
        failed.push(name)
      }
    }

    return { deleted, failed }
  })
}

app.whenReady().then(() => {
  registerDungeonIpc()
  createWindow()
})
