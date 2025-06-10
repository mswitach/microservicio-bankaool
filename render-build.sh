#!/bin/bash

echo "➡️ Instalar dependencias"
npm install

echo "⬇️ Instalar navegador para Playwright"
npx playwright install chromium

