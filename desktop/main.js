// Desktop wrapper for HTS Ledger (Mac and Windows).
// Shows index.html in its own window and gives it direct access to the
// data folder (OneDrive › HTS Expenses by default), so there is nothing to
// set up and no permission prompts after a restart.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SELFTEST = process.argv.includes('--selftest');
if (SELFTEST) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'hts-selftest-')));

const FOLDER_NAME = 'HTS Expenses';
const configFile = () => path.join(app.getPath('userData'), 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configFile(), 'utf8')); } catch { return {}; }
}
function writeConfig(c) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(c, null, 2));
}

// Find the OneDrive folder on this computer
function findOneDrive() {
  const home = os.homedir();
  const candidates = [];
  if (process.platform === 'win32') {
    candidates.push(process.env.OneDriveConsumer, process.env.OneDrive, process.env.OneDriveCommercial, path.join(home, 'OneDrive'));
  } else {
    const cloud = path.join(home, 'Library', 'CloudStorage');
    try {
      const dirs = fs.readdirSync(cloud).filter(d => d.startsWith('OneDrive'));
      dirs.sort((a, b) => (b === 'OneDrive-Personal') - (a === 'OneDrive-Personal'));
      dirs.forEach(d => candidates.push(path.join(cloud, d)));
    } catch {}
    candidates.push(path.join(home, 'OneDrive'));
  }
  return candidates.find(p => p && fs.existsSync(p)) || null;
}

function currentFolder() {
  if (SELFTEST) return process.env.HTS_FOLDER;
  const c = readConfig();
  if (c.folder) return c.folder;
  // First run: use OneDrive › HTS Expenses automatically if OneDrive is set up
  const od = findOneDrive();
  if (!od) return null;
  const folder = path.join(od, FOLDER_NAME);
  fs.mkdirSync(folder, { recursive: true });
  writeConfig({ ...c, folder, auto: true });
  return folder;
}

function requireFolder() {
  const f = currentFolder();
  if (!f) throw new Error('No data folder chosen');
  fs.mkdirSync(f, { recursive: true });
  return f;
}
const safeName = n => path.basename(String(n)); // never allow paths outside the folder

// Write via a temp file then rename, so a half-written file is never left behind
function writeAtomic(file, data) {
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

ipcMain.handle('folder:get', () => {
  const folder = currentFolder();
  return { folder, name: folder ? path.basename(folder) : null, exists: !!folder && fs.existsSync(folder), oneDrive: findOneDrive() };
});
ipcMain.handle('folder:choose', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose your HTS Ledger data folder',
    defaultPath: currentFolder() || findOneDrive() || os.homedir(),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  writeConfig({ ...readConfig(), folder: r.filePaths[0], auto: false });
  return r.filePaths[0];
});
ipcMain.handle('data:read', () => {
  const file = path.join(requireFolder(), 'data.json');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
});
ipcMain.handle('data:write', (e, text) => {
  writeAtomic(path.join(requireFolder(), 'data.json'), String(text));
  return true;
});
ipcMain.handle('receipts:list', () => {
  const dir = path.join(requireFolder(), 'receipts');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => !n.startsWith('.')) : [];
});
ipcMain.handle('receipts:write', (e, name, base64) => {
  const dir = path.join(requireFolder(), 'receipts');
  fs.mkdirSync(dir, { recursive: true });
  writeAtomic(path.join(dir, safeName(name)), Buffer.from(base64, 'base64'));
  return true;
});
ipcMain.handle('receipts:read', (e, name) => {
  const file = path.join(requireFolder(), 'receipts', safeName(name));
  return fs.existsSync(file) ? fs.readFileSync(file).toString('base64') : null;
});
ipcMain.handle('folder:open', () => { const f = currentFolder(); if (f) shell.openPath(f); });
ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 500,
    title: 'HTS Ledger',
    backgroundColor: '#f5f6f4',
    icon: path.join(__dirname, '..', 'icons', 'icon-512.png'),
    show: !SELFTEST,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  // Links open in the normal web browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  if (SELFTEST) runSelftest(win);
  return win;
}

// `npm run selftest`: loads the app against a test folder and prints what it found
function runSelftest(win) {
  win.webContents.once('did-finish-load', async () => {
    try {
      await new Promise(r => setTimeout(r, 2500));
      const result = await win.webContents.executeJavaScript(`({
        native: !!window.htsNative, sync: SYNC.state, error: SYNC.error, folder: SYNC.folderName,
        journeys: DATA.journeys.length, expenses: DATA.expenses.length,
        claim: totals(...Object.values(yearData(2026))).grand, xlsx: !!window.XLSX
      })`);
      console.log('SELFTEST ' + JSON.stringify(result));
    } catch (e) { console.log('SELFTEST-ERROR ' + e.message); }
    app.exit(0);
  });
}

if (!SELFTEST && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
