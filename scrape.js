import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'] // necesario en Render
  });

  const page = await browser.newPage();

  console.log('🌐 Abriendo https://blog.nu.com.mx/');
  await page.goto('https://blog.nu.com.mx/', { waitUntil: 'networkidle', timeout: 0 });
  await page.waitForSelector('h3.latest-post-title', { timeout: 60000 });

  const previews = await page.$$eval(
    'h3.latest-post-title',
    nodes => nodes.slice(0, 4).map(h3 => {
      const anchor = h3.closest('a.latest-post-link');
      return {
        title: h3.innerText.trim(),
        url: anchor ? anchor.href : null
      };
    })
  );

  const posts = [];
  for (const { title, url } of previews) {
    if (!url) continue;
    console.log(`🔎 Scrapeando post: ${title}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
    await page.waitForSelector('section.article-content', { timeout: 60000 });

    const content = await page.$$eval(
      'section.article-content p',
      paragraphs => paragraphs.map(p => p.innerText.trim()).join("\n\n")
    );

    posts.push({ title, url, content });
    await page.waitForTimeout(500);
  }

  await browser.close();

  // Guardar NDJSON
  const outputDir1 = path.join(__dirname, 'data/cliente2');
  fs.mkdirSync(outputDir1, { recursive: true });
  const ndjsonPath = path.join(outputDir1, 'nublog-latest-posts.ndjson');
  fs.writeFileSync(
    ndjsonPath,
    posts.map(p => JSON.stringify(p)).join('\n') + '\n'
  );
  console.log(`✅ NDJSON generado en ${ndjsonPath}`);

  // Generar HTML
  const reportDate = new Date().toLocaleDateString('es-ES');
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réporte Últimos Posts - ${reportDate}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    section { margin-bottom: 40px; }
    h2 { margin-bottom: 10px; }
    .content p { margin: 0 0 10px; }
  </style>
</head>
<body>
  <h1>Últimos Posts de fecha ${reportDate}</h1>\n`;

  posts.forEach((post, index) => {
    html += `  <section>
    <h2>Post ${index + 1}</h2>
    <p><strong>Título:</strong> ${post.title}</p>
    <div class="content">\n`;
    post.content.split("\n\n").forEach(par => {
      html += `      <p>${par}</p>\n`;
    });
    html += `    </div>\n  </section>\n`;
  });

  html += '</body>\n</html>';

  const outputDir2 = path.join(__dirname, 'reportes/cliente2');
  fs.mkdirSync(outputDir2, { recursive: true });
  const htmlPath = path.join(outputDir2, 'nublog-latest-posts.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML generado en ${htmlPath}`);
})();

