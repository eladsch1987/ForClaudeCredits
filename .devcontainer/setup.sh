#!/usr/bin/env bash
# One-time setup for GitHub Codespaces (see devcontainer.json).
set -euo pipefail

echo "==> Installing FFmpeg (needed to export the MP4)"
sudo apt-get update
sudo apt-get install -y --no-install-recommends ffmpeg

echo "==> Installing libraries headless Chrome needs to render frames"
sudo apt-get install -y --no-install-recommends \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 \
  libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 \
  libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
  libxkbcommon0 libxrandr2 fonts-liberation

echo "==> Downloading HyperFrames and its rendering browser"
cd explainer-video
npx --yes hyperframes@0.8.111 --version
npx --yes hyperframes@0.8.111 browser ensure

echo "==> Done. Studio starts automatically; or run: cd explainer-video && npm run studio"
