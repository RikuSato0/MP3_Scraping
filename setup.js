#!/usr/bin/env node
/**
 * Setup script for Chabad MP3 Scraper
 * This script helps install all required dependencies
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Run a command and handle errors
 */
function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n${description}...`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`✗ Error during ${description.toLowerCase()}: ${error.message}`);
                console.log(`Output: ${stdout}`);
                console.log(`Error: ${stderr}`);
                reject(error);
            } else {
                console.log(`✓ ${description} completed successfully`);
                if (stdout) console.log(stdout);
                resolve(stdout);
            }
        });
    });
}

/**
 * Check if Node.js version meets requirements
 */
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
        console.log("❌ Node.js 14.0 or higher is required");
        console.log(`Current version: ${nodeVersion}`);
        console.log("Please upgrade Node.js from https://nodejs.org/");
        process.exit(1);
    }
    
    console.log(`✓ Node.js ${nodeVersion} detected`);
    return true;
}

/**
 * Check if package.json exists
 */
function checkPackageJson() {
    const packagePath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packagePath)) {
        console.log("❌ package.json not found");
        console.log("Make sure you're running this script from the project root directory");
        process.exit(1);
    }
    
    console.log("✓ package.json found");
    return true;
}

/**
 * Main setup function
 */
async function main() {
    console.log("🎵 Chabad MP3 Scraper Setup (Node.js)");
    console.log("=".repeat(40));
    
    // Check Node.js version
    checkNodeVersion();
    
    // Check package.json
    checkPackageJson();
    
    try {
        // Install npm dependencies
        await runCommand("npm install", "Installing Node.js dependencies");
        
        // Note: puppeteer-real-browser automatically handles browser installation
        console.log("✓ puppeteer-real-browser will auto-download Chrome browser on first use");
        
        console.log("\n🎉 Setup completed successfully!");
        console.log("\nYou can now run the scraper with:");
        console.log("  node mp3_scraper.js");
        
        // Ask if user wants to run the scraper now
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question("\nWould you like to run the scraper now? (y/n): ", (answer) => {
            if (answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes') {
                console.log("\n🚀 Starting the scraper...");
                exec("node mp3_scraper.js", (error, stdout, stderr) => {
                    if (stdout) console.log(stdout);
                    if (stderr) console.log(stderr);
                    if (error) console.log(`Error: ${error.message}`);
                    rl.close();
                });
            } else {
                console.log("\n👋 Setup completed. Run 'node mp3_scraper.js' when ready!");
                rl.close();
            }
        });
        
    } catch (error) {
        console.log("❌ Setup failed!");
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.log(`❌ Setup failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runCommand, checkNodeVersion, checkPackageJson }; 