#!/bin/bash
# Build script to compile TypeScript and run Jekyll

echo "Installing TypeScript dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Building Jekyll site..."
bundle exec jekyll build

echo "Build complete!"
