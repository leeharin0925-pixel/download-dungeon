"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("dungeon", {
  scanDownloads() {
    return electron.ipcRenderer.invoke("dungeon:scanDownloads");
  },
  organizeDownloads() {
    return electron.ipcRenderer.invoke("dungeon:organizeDownloads");
  },
  analyzeDownloads() {
    return electron.ipcRenderer.invoke("dungeon:analyzeDownloads");
  },
  deleteFiles(fileNames) {
    return electron.ipcRenderer.invoke("dungeon:deleteFiles", fileNames);
  }
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
