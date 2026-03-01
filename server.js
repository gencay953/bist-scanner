const express = require('express');
const path    = require('path');
const https   = require('https');
const app     = express();

app.use(express.static(path.join(__dirname, 'public')));

// Yahoo Finance proxy endpoint
app.get('/proxy', async (req, res) => {
  const sym      = req.query.sym;
  const interval = req.query.interval || '1d';
  const range    = req.query.range    || '2y';

  if (!sym) return res.status(400).json({ error: 'sym gerekli' });

  const ticker = sym.toUpperCase() + '.IS';
  const path2  = `/v8/finance/chart/${ticker}?range=${range}&interval=${interval}&includePrePost=false&corsDomain=finance.yahoo.com`;

  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const host of hosts) {
    try {
      const data = await fetchYahoo(host, path2);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(data);
    } catch(e) {
      continue;
    }
  }

  res.status(502).json({ error: 'Veri alınamadı' });
});

function fetchYahoo(host, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com'
      },
      timeout: 15000
    };

    const req = https.request(options, (resp) => {
      if (resp.statusCode !== 200) return reject(new Error('HTTP ' + resp.statusCode));
      let body = '';
      resp.on('data', chunk => body += chunk);
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// HTML için tüm rotaları index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('BIST Scanner çalışıyor: port ' + PORT));
