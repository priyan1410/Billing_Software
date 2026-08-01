const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let userDataPath = '';
function getAppDataPath() {
  if (!userDataPath) {
    try {
      if (app && app.getPath) userDataPath = app.getPath('userData');
    } catch (e) {}
  }
  return userDataPath || __dirname;
}

function getBackupConfigPath() {
  return path.join(getAppDataPath(), 'backup-config.json');
}

function getDefaultBackupDir() {
  // Prefer C:\kish_mandhi_backups for Windows easy access, fallback to userData/backups
  const localC = 'C:\\kish_mandhi_backups';
  try {
    if (process.platform === 'win32') {
      if (!fs.existsSync(localC)) {
        fs.mkdirSync(localC, { recursive: true });
      }
      return localC;
    }
  } catch (e) {}
  const appBackupDir = path.join(getAppDataPath(), 'backups');
  if (!fs.existsSync(appBackupDir)) {
    fs.mkdirSync(appBackupDir, { recursive: true });
  }
  return appBackupDir;
}

// Config State
const backupConfig = {
  enabled: true,
  backupPath: '',
  retentionDays: 30,
  lastBackupTime: null
};

function loadBackupConfig() {
  try {
    const cp = getBackupConfigPath();
    if (fs.existsSync(cp)) {
      const parsed = JSON.parse(fs.readFileSync(cp, 'utf8'));
      Object.assign(backupConfig, parsed);
    }
  } catch (e) {
    console.error('Failed to load backup-config.json:', e.message);
  }
  if (!backupConfig.backupPath) {
    backupConfig.backupPath = getDefaultBackupDir();
  }
  return backupConfig;
}

function saveBackupConfig(newCfg) {
  Object.assign(backupConfig, newCfg);
  try {
    const cp = getBackupConfigPath();
    fs.writeFileSync(cp, JSON.stringify(backupConfig, null, 2));
  } catch (e) {
    console.error('Failed to save backup-config.json:', e.message);
  }
  return backupConfig;
}

// Clean backups older than retentionDays
function cleanOldBackups(targetDir, retentionDays = 30) {
  try {
    if (!fs.existsSync(targetDir)) return;
    const files = fs.readdirSync(targetDir);
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    for (const f of files) {
      if (f.startsWith('Kish_Mandhi_Backup_') && f.endsWith('.json')) {
        const fp = path.join(targetDir, f);
        const stats = fs.statSync(fp);
        if (now - stats.mtimeMs > maxAgeMs) {
          try {
            fs.unlinkSync(fp);
            console.log(`✓ Cleaned old backup file: ${f}`);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.error('cleanOldBackups error:', err.message);
  }
}

// Perform instant backup
async function performBackup(exportFullSystemFn, customPath = null) {
  loadBackupConfig();
  const targetDir = customPath || backupConfig.backupPath || getDefaultBackupDir();

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const exportRes = await exportFullSystemFn();
    if (!exportRes || !exportRes.success || !exportRes.data) {
      return { success: false, message: exportRes?.message || 'Failed to export system data' };
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    const filename = `Kish_Mandhi_Backup_${dateStr}_${timeStr}.json`;
    const targetFile = path.join(targetDir, filename);
    const tmpFile = path.join(targetDir, `${filename}.tmp`);

    const jsonContent = JSON.stringify(exportRes.data, null, 2);

    // Atomic write (write to .tmp first, then rename)
    fs.writeFileSync(tmpFile, jsonContent, 'utf8');
    fs.renameSync(tmpFile, targetFile);

    // Also write a latest snapshot copy for quick recovery
    const latestFile = path.join(targetDir, 'latest_backup.json');
    fs.writeFileSync(latestFile, jsonContent, 'utf8');

    // Update last backup time
    backupConfig.lastBackupTime = now.toISOString();
    saveBackupConfig({ lastBackupTime: backupConfig.lastBackupTime });

    // Clean old backups beyond retention window
    cleanOldBackups(targetDir, backupConfig.retentionDays || 30);

    const stats = fs.statSync(targetFile);
    const sizeKb = (stats.size / 1024).toFixed(1);

    const recordCount = (exportRes.data.orders?.length || 0) +
                        (exportRes.data.menuItems?.length || 0) +
                        (exportRes.data.expenses?.length || 0) +
                        (exportRes.data.categories?.length || 0) +
                        (exportRes.data.tokens?.length || 0);

    return {
      success: true,
      message: `✓ Full System Backup created successfully at ${filename}!`,
      filePath: targetFile,
      filename,
      sizeBytes: stats.size,
      sizeFormatted: `${sizeKb} KB`,
      recordCount,
      timestamp: backupConfig.lastBackupTime
    };
  } catch (err) {
    console.error('performBackup error:', err.message);
    return { success: false, message: `Backup failed: ${err.message}` };
  }
}

// List all backups in directory
function listBackups(customPath = null) {
  loadBackupConfig();
  const targetDir = customPath || backupConfig.backupPath || getDefaultBackupDir();

  try {
    if (!fs.existsSync(targetDir)) return { success: true, backups: [], targetDir };

    const files = fs.readdirSync(targetDir);
    const backups = [];

    for (const f of files) {
      if ((f.startsWith('Kish_Mandhi_Backup_') || f === 'latest_backup.json') && f.endsWith('.json')) {
        const fp = path.join(targetDir, f);
        try {
          const stats = fs.statSync(fp);
          const sizeKb = (stats.size / 1024).toFixed(1);
          backups.push({
            filename: f,
            filePath: fp,
            sizeBytes: stats.size,
            sizeFormatted: `${sizeKb} KB`,
            mtime: stats.mtime.toISOString(),
            isLatest: f === 'latest_backup.json'
          });
        } catch (e) {}
      }
    }

    // Sort newest first
    backups.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return { success: true, backups, targetDir };
  } catch (err) {
    return { success: false, message: err.message, backups: [], targetDir };
  }
}

// Auto-scheduler background task
function startBackupScheduler(exportFullSystemFn) {
  loadBackupConfig();

  // Run initial check 10 seconds after start
  setTimeout(async () => {
    if (shouldRunBackup()) {
      console.log('⏰ Auto Backup Scheduler: Running daily backup...');
      await performBackup(exportFullSystemFn);
    }
  }, 10000);

  // Check every hour
  setInterval(async () => {
    if (shouldRunBackup()) {
      console.log('⏰ Auto Backup Scheduler: Running daily backup...');
      await performBackup(exportFullSystemFn);
    }
  }, 60 * 60 * 1000);
}

function shouldRunBackup() {
  loadBackupConfig();
  if (!backupConfig.enabled) return false;
  if (!backupConfig.lastBackupTime) return true;

  const last = new Date(backupConfig.lastBackupTime).getTime();
  const now = Date.now();
  const hoursSince = (now - last) / (1000 * 60 * 60);

  return hoursSince >= 24; // Backup once per 24 hours
}

module.exports = {
  loadBackupConfig,
  saveBackupConfig,
  performBackup,
  listBackups,
  startBackupScheduler,
  shouldRunBackup
};
