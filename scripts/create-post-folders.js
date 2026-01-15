#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the root directory (assuming script is in /scripts folder)
const rootDir = path.join(__dirname, '..');
const postsDir = path.join(rootDir, '_posts');
const assetsImagesDir = path.join(rootDir, 'assets', 'images');
const postsImagesDir = path.join(assetsImagesDir, 'posts');

// Ensure the posts images directory exists
if (!fs.existsSync(postsImagesDir)) {
    fs.mkdirSync(postsImagesDir, { recursive: true });
    console.log('📁 Created posts images directory:', postsImagesDir);
}

// Function to extract post slug from filename
function getPostSlug(filename) {
    // Remove .md extension and date prefix (YYYY-MM-DD-)
    const nameWithoutExt = filename.replace(/\.md$/, '');
    const slugMatch = nameWithoutExt.match(/^\d{4}-\d{1,2}-\d{1,2}-(.+)$/);
    return slugMatch ? slugMatch[1] : nameWithoutExt;
}

// Function to create folder for a post
function createPostFolder(postFilename) {
    const slug = getPostSlug(postFilename);
    const folderPath = path.join(postsImagesDir, slug);
    
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('✅ Created folder:', slug);
        return true;
    } else {
        console.log('⏭️  Folder already exists:', slug);
        return false;
    }
}

// Main function
function main() {
    console.log('🚀 Creating image folders for blog posts...\n');
    
    try {
        // Read all files in _posts directory
        const postFiles = fs.readdirSync(postsDir)
            .filter(file => file.endsWith('.md'))
            .sort();
        
        if (postFiles.length === 0) {
            console.log('❌ No markdown files found in _posts directory');
            return;
        }
        
        console.log(`📝 Found ${postFiles.length} posts:\n`);
        
        let createdCount = 0;
        postFiles.forEach(filename => {
            if (createPostFolder(filename)) {
                createdCount++;
            }
        });
        
        console.log(`\n✨ Done! Created ${createdCount} new folders.`);
        console.log(`📁 All post image folders are now available in: assets/images/posts/`);
        
        // List all created folders
        const allFolders = fs.readdirSync(postsImagesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort();
            
        if (allFolders.length > 0) {
            console.log(`\n📋 Available post folders:`);
            allFolders.forEach(folder => console.log(`   • ${folder}`));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, getPostSlug, createPostFolder };
