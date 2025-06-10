// server.js
import express from 'express';
import { exec } from 'child_process';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Ruta para ejecutar el scraper
app.get('/run-scraper', (req, res) => {
  exec('node scrape.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).send('Error ejecutando el scraper.');
    }
    res.send('Scraping ejecutado con éxito.');
  });
});

// Ruta para ver el NDJSON generado
app.get('/ndjson', (req, res) => {
  res.sendFile(path.resolve('./data/cliente2/nublog-latest-posts.ndjson'));
});

// Ruta para ver el HTML generado
app.get('/reporte', (req, res) => {
  res.sendFile(path.resolve('./reportes/cliente2/nublog-latest-posts.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

