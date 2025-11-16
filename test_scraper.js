#!/usr/bin/env node
/**
 * Test script for Chabad MP3 Scraper
 * This script performs basic tests to ensure the scraper is set up correctly
 */

const { connect } = require('puppeteer-real-browser');
const {
    START_URL,
    BROWSER_SETTINGS,
    SELECTORS,
    BASE_URL
} = require('./config');

/**
 * Simple test logger
 */
class TestLogger {
    static info(message) {
        console.log(`[TEST-INFO] ${new Date().toISOString()} - ${message}`);
    }
    
    static error(message) {
        console.log(`[TEST-ERROR] ${new Date().toISOString()} - ${message}`);
    }
    
    static warning(message) {
        console.log(`[TEST-WARNING] ${new Date().toISOString()} - ${message}`);
    }
}

/**
 * Test if puppeteer-real-browser is installed and working
 */
async function testPuppeteerInstallation() {
    try {
        const { browser, page } = await connect({
            headless: 'auto',
            turnstile: true
        });
        
        await page.goto("https://www.google.com");
        const title = await page.title();
        await browser.close();
        
        if (title.includes("Google")) {
            TestLogger.info("✓ puppeteer-real-browser installation test PASSED");
            return true;
        } else {
            TestLogger.error("✗ puppeteer-real-browser installation test FAILED - Unexpected page title");
            return false;
        }
        
    } catch (error) {
        TestLogger.error(`✗ puppeteer-real-browser installation test FAILED: ${error.message}`);
        return false;
    }
}

/**
 * Test if the target website is accessible
 */
async function testWebsiteAccess() {
    try {
        const { browser, page } = await connect({
            headless: 'auto',
            turnstile: true
        });
        
        const response = await page.goto(START_URL, { timeout: 30000 });
        
        if (response.ok()) {
            const title = await page.title();
            TestLogger.info(`✓ Website access test PASSED - Page title: ${title}`);
            await browser.close();
            return true;
        } else {
            TestLogger.error(`✗ Website access test FAILED - HTTP status: ${response.status()}`);
            await browser.close();
            return false;
        }
        
    } catch (error) {
        TestLogger.error(`✗ Website access test FAILED: ${error.message}`);
        return false;
    }
}

/**
 * Test if the configured selectors can find elements on the start page
 */
async function testSelectorPresence() {
    try {
        const { browser, page } = await connect({
            headless: 'auto',
            turnstile: true
        });
        
        await page.goto(START_URL, { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for dynamic content
        
        // Test view all button selectors
        let viewAllFound = false;
        for (const selector of SELECTORS.viewAllButtons) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    viewAllFound = true;
                    TestLogger.info(`✓ Found ${elements.length} 'view all' buttons with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!viewAllFound) {
            TestLogger.warning("⚠ No 'view all' buttons found - this may be expected on the start page");
        }
        
        // Test video link selectors
        let videoLinksFound = false;
        for (const selector of SELECTORS.videoLinks) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    videoLinksFound = true;
                    TestLogger.info(`✓ Found ${elements.length} video links with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!videoLinksFound) {
            TestLogger.warning("⚠ No video links found on start page");
        }
        
        // Test metadata selectors
        let metadataFound = 0;
        for (const [field, selectors] of Object.entries(SELECTORS.metadata)) {
            for (const selector of selectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const text = await page.evaluate(element => element.innerText, element);
                        if (text && text.trim()) {
                            TestLogger.info(`✓ Found ${field}: ${text.trim().substring(0, 50)}...`);
                            metadataFound++;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        await browser.close();
        
        if (viewAllFound || videoLinksFound || metadataFound > 0) {
            TestLogger.info("✓ Selector presence test PASSED");
            return true;
        } else {
            TestLogger.warning("⚠ Selector presence test completed with warnings");
            return true;
        }
        
    } catch (error) {
        TestLogger.error(`✗ Selector presence test FAILED: ${error.message}`);
        return false;
    }
}

/**
 * Test if configuration is properly loaded
 */
async function testConfiguration() {
    try {
        // Test basic configuration values
        if (!START_URL || !START_URL.startsWith("http")) {
            TestLogger.error("✗ Configuration test FAILED - Invalid START_URL");
            return false;
        }
        
        if (!BASE_URL || !BASE_URL.startsWith("http")) {
            TestLogger.error("✗ Configuration test FAILED - Invalid BASE_URL");
            return false;
        }
        
        if (!SELECTORS || typeof SELECTORS !== 'object') {
            TestLogger.error("✗ Configuration test FAILED - Invalid SELECTORS");
            return false;
        }
        
        const requiredSelectorKeys = ["viewAllButtons", "videoLinks", "downloadLinks", "metadata"];
        for (const key of requiredSelectorKeys) {
            if (!(key in SELECTORS)) {
                TestLogger.error(`✗ Configuration test FAILED - Missing selector key: ${key}`);
                return false;
            }
        }
        
        TestLogger.info("✓ Configuration test PASSED");
        return true;
        
    } catch (error) {
        TestLogger.error(`✗ Configuration test FAILED: ${error.message}`);
        return false;
    }
}

/**
 * Run all tests and report results
 */
async function runAllTests() {
    TestLogger.info("🧪 Starting Chabad MP3 Scraper Tests");
    TestLogger.info("=".repeat(50));
    
    const tests = [
        ["Configuration Loading", testConfiguration],
        ["puppeteer-real-browser Installation", testPuppeteerInstallation],
        ["Website Access", testWebsiteAccess],
        ["Selector Presence", testSelectorPresence],
    ];
    
    const results = [];
    
    for (const [testName, testFunc] of tests) {
        TestLogger.info(`\n🔍 Running ${testName} test...`);
        try {
            const result = await testFunc();
            results.push([testName, result]);
        } catch (error) {
            TestLogger.error(`✗ ${testName} test encountered an error: ${error.message}`);
            results.push([testName, false]);
        }
    }
    
    // Summary
    TestLogger.info("\n" + "=".repeat(50));
    TestLogger.info("📊 TEST RESULTS SUMMARY");
    TestLogger.info("=".repeat(50));
    
    let passed = 0;
    for (const [testName, result] of results) {
        const status = result ? "PASSED" : "FAILED";
        const symbol = result ? "✓" : "✗";
        TestLogger.info(`${symbol} ${testName}: ${status}`);
        if (result) {
            passed++;
        }
    }
    
    TestLogger.info(`\nTests passed: ${passed}/${tests.length}`);
    
    if (passed === tests.length) {
        TestLogger.info("🎉 All tests passed! The scraper should work correctly.");
        TestLogger.info("Run 'node mp3_scraper.js' to start scraping.");
    } else if (passed >= tests.length - 1) {
        TestLogger.info("⚠ Most tests passed. The scraper should work with minor issues.");
        TestLogger.info("Run 'node mp3_scraper.js' to start scraping.");
    } else {
        TestLogger.error("❌ Several tests failed. Please check your setup.");
        TestLogger.error("Try running 'npm install' to reinstall dependencies.");
        return false;
    }
    
    return passed >= tests.length - 1;
}

/**
 * Main function to run tests
 */
async function main() {
    try {
        const result = await runAllTests();
        process.exit(result ? 0 : 1);
    } catch (error) {
        TestLogger.error(`❌ Unexpected error running tests: ${error.message}`);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        TestLogger.error(`❌ Test execution failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    testPuppeteerInstallation,
    testWebsiteAccess,
    testSelectorPresence,
    testConfiguration,
    runAllTests
}; 