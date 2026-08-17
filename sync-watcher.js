/**
 * 🔄 Zero-Mile MedConnect - Automatic Git Sync Watcher
 * Automatically watches all project files and pushes changes to GitHub in real-time.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let syncTimeout = null;
const DEBOUNCE_MS = 3000; // Wait 3 seconds after last file change before pushing

function triggerGitSync() {
  console.log('⚡ File change detected! Auto-syncing to GitHub in 3 seconds...');
  
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    const timestamp = new Date().toLocaleString();
    const cmd = `git add . && git commit -m "Auto-sync update: ${timestamp}" && git push origin main`;

    console.log('🚀 Pushing latest changes to GitHub (SujalChavhan/project-nagpur)...');
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        if (stdout && stdout.includes('nothing to commit')) {
          console.log('✓ Working tree already clean. No changes needed.');
        } else {
          console.warn('⚠️ Git Sync Note:', error.message);
        }
        return;
      }
      console.log('==================================================');
      console.log(`✅ GitHub Repository Successfully Updated! (${timestamp})`);
      console.log('🔗 https://github.com/SujalChavhan/project-nagpur');
      console.log('==================================================');
    });
  }, DEBOUNCE_MS);
}

// Watch project root and key directories
const WATCH_PATHS = [
  __dirname,
  path.join(__dirname, 'js'),
  path.join(__dirname, 'css'),
  path.join(__dirname, 'server'),
  path.join(__dirname, 'data')
];

WATCH_PATHS.forEach(dirPath => {
  if (fs.existsSync(dirPath)) {
    fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
      if (!filename) return;
      // Ignore git internals and node_modules
      if (filename.startsWith('.git') || filename.includes('node_modules') || filename.endsWith('.tmp')) {
        return;
      }
      triggerGitSync();
    });
  }
});

console.log('====================================================');
console.log('👀 Zero-Mile Auto-Sync Watcher Active!');
console.log('Every time you edit any file, it will auto-push to GitHub.');
console.log('Repository: https://github.com/SujalChavhan/project-nagpur');
console.log('====================================================');
