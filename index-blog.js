import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Script para scrapear los últimos 4 posts de https://blog.nu.com.mx/ (sección "Últimos posts")
(async () => {
  // 1. Lanzar navegador y abrir página principal
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🌐 Abriendo https://blog.nu.com.mx/');
  await page.goto('https://blog.nu.com.mx/', { waitUntil: 'networkidle', timeout: 0 });

  // 2. Esperar a que los títulos de últimos posts estén en el DOM
  await page.waitForSelector('h3.latest-post-title', { timeout: 60000 });

  // 3. Extraer los primeros 4 títulos y sus URLs
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

  // 4. Navegar a cada URL y extraer el contenido
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

  // 5. Cerrar navegador
  await browser.close();

  // 6. Guardar resultados en NDJSON
  const outputDir1 = path.resolve('data/cliente2');
  fs.mkdirSync(outputDir1, { recursive: true });
  const ndjsonPath = path.join(outputDir1, 'nublog-latest-posts.ndjson');
  fs.writeFileSync(
    ndjsonPath,
    posts.map(p => JSON.stringify(p)).join('\n') + '\n'
  );
  console.log(`✅ Scrape completo.`);
  console.log(`✅ Datos guardados en ${ndjsonPath}`);

  // 7. Generar reporte HTML
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
  <h1>Últimos Posts de fecha ${reportDate}</h1>
`;

  posts.forEach((post, index) => {
    html += `  <section>
    <h2>Post ${index + 1}</h2>
    <p><strong>Título:</strong> ${post.title}</p>
    <div class="content">
`;
    // Párrafos
    post.content.split("\n\n").forEach(par => {
      html += `      <p>${par}</p>\n`;
    });
    html += '    </div>\n  </section>\n';
  });

  html += '</body>\n</html>';

  const outputDir2 = path.resolve('reportes/cliente2');
  const htmlPath = path.join(outputDir2, 'nublog-latest-posts.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ Reporte HTML generado en ${htmlPath}`);
})();

