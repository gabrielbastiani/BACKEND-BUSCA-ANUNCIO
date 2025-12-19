// src/config/puppeteer.config.ts

import type { LaunchOptions, WaitForOptions } from 'puppeteer';
import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Detecta automaticamente o caminho do Chrome/Chromium instalado
 */
function findChromePath(): string | undefined {
  const platform = os.platform();
  console.log(`🔍 Detectando Chrome no sistema: ${platform}`);

  let possiblePaths: string[] = [];

  if (platform === 'win32') {
    // Windows
    possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ];
  } else if (platform === 'darwin') {
    // macOS
    possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
  } else if (platform === 'linux') {
    // Linux
    possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];
  }

  for (const chromePath of possiblePaths) {
    try {
      if (fs.existsSync(chromePath)) {
        console.log(`✅ Chrome encontrado em: ${chromePath}`);
        return chromePath;
      }
    } catch (error) {
      continue;
    }
  }

  console.log('ℹ️ Chrome do sistema não encontrado, usando o do Puppeteer');
  return undefined; // Deixa o Puppeteer usar o Chrome que vem com ele
}

export const puppeteerConfig: LaunchOptions = {
  headless: false, // Mude para true em produção
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || findChromePath(),
  defaultViewport: null,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--start-maximized',
    '--window-size=1920,1080',
    '--disable-infobars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ],
  ignoreDefaultArgs: ['--enable-automation']
};

export const navigationOptions = {
  waitUntil: 'networkidle0' as const,
  timeout: 60000
};

export const waitForSelectorOptions: WaitForOptions = {
  timeout: 30000
};