/// <reference types="vite/client" />

type DungeonScanResult = {
  root: string
  items: {
    name: string
    isDirectory: boolean
    ext: string
    size: number
    mtimeMs: number
  }[]
}

type DungeonOrganizeResult = {
  moved: number
  moves: string[]
  failed: string[]
}

type DungeonAnalyzeResult = {
  root: string
  duplicateGroups: {
    name: string
    size: number
    count: number
    files: string[]
  }[]
  recommendations: {
    name: string
    size: number
    atimeMs: number
    score: number
    reasons: string[]
  }[]
  scannedFileCount: number
}

type DungeonDeleteResult = {
  deleted: number
  failed: string[]
}

declare global {
  interface Window {
    dungeon?: {
      scanDownloads: () => Promise<DungeonScanResult>
      organizeDownloads: () => Promise<DungeonOrganizeResult>
      analyzeDownloads: () => Promise<DungeonAnalyzeResult>
      deleteFiles: (fileNames: string[]) => Promise<DungeonDeleteResult>
    }
    ipcRenderer: import('electron').IpcRenderer
  }
}

export {}