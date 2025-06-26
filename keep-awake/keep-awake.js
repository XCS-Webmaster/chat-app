const https = require('https');
const express = require('express');
const app = express();

const URL = 'https://chat-app-7437.onrender.com/healthcheck'; // Your chat app
const INTERVAL = 60 * 1000;
const logs = [];
let currentStatus = null; // 'online', 'offline', or null

app.use(express.static('public'));

function log(message, success = true) {
  const timestamp = new Date();
  logs.unshift({ timestamp, message });
  if (logs.length > 500) logs.pop();
  currentStatus = success ? 'online' : 'offline';
  console.log(`[${timestamp.toISOString()}] ${message}`);
}

function pruneOldLogs() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (now - logs[i].timestamp.getTime() > oneDay) logs.splice(i, 1);
  }
}

function ping(retry = false) {
  const start = Date.now();
  const req = https.get(URL, res => {
    const duration = Date.now() - start;
    log(`✅ ${res.statusCode} ${res.statusMessage} (${duration}ms)`, true);
  });

  req.on('error', err => {
    log(`❌ Ping failed: ${err.message}`, false);
    if (!retry) setTimeout(() => ping(true), 10 * 1000);
  });

  req.setTimeout(8000, () => {
    log(`⚠️ Ping timed out`, false);
    req.destroy();
  });

  req.end();
}

ping();
setInterval(ping, INTERVAL);
setInterval(pruneOldLogs, 30 * 60 * 1000);

// Optional UI to inspect logs if deployed as a web service:
app.get('/', (req, res) => {
  const statusText = currentStatus === 'online' ? '🟢 ONLINE'
                    : currentStatus === 'offline' ? '🔴 OFFLINE'
                    : '🕒 STARTING...';

  const statusColor = currentStatus === 'online' ? '#3967d9'
                      : currentStatus === 'offline' ? '#e52238'
                      : '#999';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>XPRESS Keep-Alive Logs</title>
      <style>
        body {
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: monospace;
          padding: 1em;
          text-align: center;
        }
        .logo {
          width: 220px;
          margin: 0 auto 1em;
          display: block;
        }
        h1 {
          color: #61dafb;
          margin-bottom: 0.2em;
        }
        .status {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: bold;
          margin-bottom: 1.5em;
          background-color: ${statusColor};
          color: white;
        }
        .log {
          text-align: left;
          white-space: pre-wrap;
          border-bottom: 1px solid #444;
          padding: 0.25em 0;
          max-width: 800px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <img src="/logo.png" class="logo" alt="XPRESS Logo"/>
      <h1>🚀 Keep-Alive Ping Logs</h1>
      <div class="status">${statusText}</div>
      ${logs.map(entry => `<div class="log">[${entry.timestamp.toISOString()}] ${entry.message}</div>`).join('')}
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log(`🟢 Keep-awake service running at port ${PORT}`);
});
