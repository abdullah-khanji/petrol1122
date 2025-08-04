const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pythonProc;
function createWindow () {
  const win = new BrowserWindow({
    width: 1366, height: 768,
    webPreferences: { contextIsolation: true }
  });
  win.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  pythonProc = spawn(process.platform === 'win32' ? 'python.exe' : 'python', [
    path.join(__dirname, 'backend', 'app.py')
  ]);
  pythonProc.stdout.on('data', d => console.log('[py]', d.toString()));
  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProc) pythonProc.kill();
  if (process.platform !== 'darwin') app.quit();
});
