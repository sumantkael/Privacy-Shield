/**
 * Privacy Shield - Cross-Browser Build Pipeline
 * Bundles code and produces ready-to-load extensions for Chrome and Firefox.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { generateAllIcons } from './generate-icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_CHROME = path.join(ROOT_DIR, 'dist', 'chrome');
const DIST_FIREFOX = path.join(ROOT_DIR, 'dist', 'firefox');
const LANDING_DIR = path.join(ROOT_DIR, 'landing');
const DOWNLOADS_DIR = path.join(LANDING_DIR, 'downloads');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

async function buildTarget(targetName, outDir, manifestSrc) {
  console.log(`\n📦 Building Privacy Shield for ${targetName}...`);

  // Ensure clean output directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Bundle JavaScript files
  // Content script is bundled as IIFE to run cleanly in content script isolation
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'content', 'content.js')],
    bundle: true,
    outfile: path.join(outDir, 'content', 'content.js'),
    format: 'iife',
    platform: 'browser',
    target: ['chrome100', 'firefox109'],
    minify: false
  });

  // Page guard script (runs in MAIN world)
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'content', 'page-guard.js')],
    bundle: true,
    outfile: path.join(outDir, 'content', 'page-guard.js'),
    format: 'iife',
    platform: 'browser',
    target: ['chrome100', 'firefox109'],
    minify: false
  });

  // Background script
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'background', 'background.js')],
    bundle: true,
    outfile: path.join(outDir, 'background', 'background.js'),
    format: targetName === 'Chrome' ? 'esm' : 'iife',
    platform: 'browser',
    target: ['chrome100', 'firefox109'],
    minify: false
  });

  // Popup script
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'popup', 'popup.js')],
    bundle: true,
    outfile: path.join(outDir, 'popup', 'popup.js'),
    format: 'esm',
    platform: 'browser',
    target: ['chrome100', 'firefox109'],
    minify: false
  });

  // Settings script
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'settings', 'settings.js')],
    bundle: true,
    outfile: path.join(outDir, 'settings', 'settings.js'),
    format: 'esm',
    platform: 'browser',
    target: ['chrome100', 'firefox109'],
    minify: false
  });

  // 2. Copy static HTML and CSS assets
  copyRecursiveSync(path.join(SRC_DIR, 'popup', 'popup.html'), path.join(outDir, 'popup', 'popup.html'));
  copyRecursiveSync(path.join(SRC_DIR, 'popup', 'popup.css'), path.join(outDir, 'popup', 'popup.css'));

  copyRecursiveSync(path.join(SRC_DIR, 'settings', 'settings.html'), path.join(outDir, 'settings', 'settings.html'));
  copyRecursiveSync(path.join(SRC_DIR, 'settings', 'settings.css'), path.join(outDir, 'settings', 'settings.css'));

  copyRecursiveSync(path.join(SRC_DIR, 'content', 'styles.css'), path.join(outDir, 'content', 'styles.css'));
  copyRecursiveSync(path.join(SRC_DIR, 'assets'), path.join(outDir, 'assets'));

  // 3. Copy Manifest
  fs.copyFileSync(manifestSrc, path.join(outDir, 'manifest.json'));

  console.log(`✅ ${targetName} build finished successfully at: ${outDir}`);
}

function packageReleaseAssets() {
  console.log('\n📦 Packaging release assets...');

  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  const chromeZip = path.join(DOWNLOADS_DIR, 'privacy-shield-chrome.zip');
  const firefoxZip = path.join(DOWNLOADS_DIR, 'privacy-shield-firefox.zip');
  const firefoxXpi = path.join(DOWNLOADS_DIR, 'privacy-shield-firefox.xpi');

  try {
    if (process.platform === 'win32') {
      execSync(`tar -a -cf "${chromeZip}" -C "${DIST_CHROME}" .`, { stdio: 'inherit' });
      execSync(`tar -a -cf "${firefoxZip}" -C "${DIST_FIREFOX}" .`, { stdio: 'inherit' });
    } else {
      execSync(`cd "${DIST_CHROME}" && zip -r "${chromeZip}" .`, { stdio: 'inherit' });
      execSync(`cd "${DIST_FIREFOX}" && zip -r "${firefoxZip}" .`, { stdio: 'inherit' });
    }

    fs.copyFileSync(firefoxZip, firefoxXpi);
    console.log('✅ Packaged privacy-shield-chrome.zip');
    console.log('✅ Packaged privacy-shield-firefox.xpi');
    console.log('✅ Packaged privacy-shield-firefox.zip');
  } catch (err) {
    console.warn('⚠️ Release packaging notice:', err.message);
  }

  // Synchronize landing website to docs/ (for GitHub Pages) and public/ (for Vercel)
  try {
    if (fs.existsSync(DOCS_DIR)) {
      fs.rmSync(DOCS_DIR, { recursive: true, force: true });
    }
    copyRecursiveSync(LANDING_DIR, DOCS_DIR);
    console.log('✅ Synchronized landing page to docs/ for GitHub Pages');

    if (fs.existsSync(PUBLIC_DIR)) {
      fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
    }
    copyRecursiveSync(LANDING_DIR, PUBLIC_DIR);
    console.log('✅ Synchronized landing page to public/ for Vercel');
  } catch (err) {
    console.warn('⚠️ output sync notice:', err.message);
  }
}

async function run() {
  try {
    generateAllIcons();

    // Build Chrome distribution
    await buildTarget('Chrome', DIST_CHROME, path.join(ROOT_DIR, 'manifests', 'manifest.chrome.json'));

    // Build Firefox distribution
    await buildTarget('Firefox', DIST_FIREFOX, path.join(ROOT_DIR, 'manifests', 'manifest.firefox.json'));

    // Package release zip archives and sync docs/ for GitHub Pages
    packageReleaseAssets();

    console.log('\n🎉 Cross-browser builds & release packages ready!\n');
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

run();
