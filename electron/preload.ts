import { ipcRenderer, contextBridge } from 'electron'

export type DungeonScanResult = {
  root: string
  items: {
    name: string
    isDirectory: boolean
    ext: string
    size: number
    mtimeMs: number
  }[]
}

export type DungeonOrganizeResult = {
  moved: number
  moves: string[]
  failed: string[]
}

export type DungeonAnalyzeResult = {
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

export type DungeonDeleteResult = {
  deleted: number
  failed: string[]
}

contextBridge.exposeInMainWorld('dungeon', {
  scanDownloads(): Promise<DungeonScanResult> {
    return ipcRenderer.invoke('dungeon:scanDownloads')
  },
  organizeDownloads(): Promise<DungeonOrganizeResult> {
    return ipcRenderer.invoke('dungeon:organizeDownloads')
  },
  analyzeDownloads(): Promise<DungeonAnalyzeResult> {
    return ipcRenderer.invoke('dungeon:analyzeDownloads')
  },
  deleteFiles(fileNames: string[]): Promise<DungeonDeleteResult> {
    return ipcRenderer.invoke('dungeon:deleteFiles', fileNames)
  },
})

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})