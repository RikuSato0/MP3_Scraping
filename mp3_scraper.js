const { connect } = require('puppeteer-real-browser');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const {
    START_URL,
    OUTPUT_FILE,
    BROWSER_SETTINGS,
    PAGE_SETTINGS,
    SELECTORS,
    BASE_URL,
    LOGGING_SETTINGS,
    RATE_LIMIT,
    ADVANCED
} = require('./config');

/**
 * Simple logger utility
 */
class Logger {
    static info(message) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
    
    static warning(message) {
        console.log(`[WARNING] ${new Date().toISOString()} - ${message}`);
    }
    
    static error(message) {
        console.log(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }
    
    static debug(message) {
        if (LOGGING_SETTINGS.level === 'DEBUG') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
        }
    }
}

/**
 * Main scraper class for Chabad MP3 extraction
 */
class ChabadMP3Scraper {
    constructor(startUrl = null, outputFile = null) {
        this.startUrl = startUrl || START_URL;
        this.outputFile = outputFile || OUTPUT_FILE;
        this.baseUrl = BASE_URL;
        this.scrapedData = [];
        this.visitedUrls = new Set();
    }

    /**
     * Main function to run the scraper
     */
    async run() {
        let browser = null;
        let page = null;
        
        try {
            Logger.info("Launching puppeteer-real-browser with stealth features...");
            
            // Connect to browser with puppeteer-real-browser (enhanced stealth)
            const { browser: realBrowser, page: realPage } = await connect({
                headless: BROWSER_SETTINGS.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-translate',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI,VizDisplayCompositor',
                    '--disable-ipc-flooding-protection',
                    `--window-size=${ADVANCED.viewport.width},${ADVANCED.viewport.height}`,
                ],
                ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
                defaultViewport: ADVANCED.viewport,
                slowMo: BROWSER_SETTINGS.slowMo
            });

            browser = realBrowser;
            page = realPage;

            // Set user agent and viewport
            await page.setUserAgent(ADVANCED.userAgent);
            await page.setViewport(ADVANCED.viewport);

            // Remove webdriver traces (additional stealth)
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                delete navigator.__proto__.webdriver;
                
                // Additional stealth measures
                window.chrome = {
                    runtime: {},
                };
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
            });

            Logger.info(`Starting scraper from: ${this.startUrl}`);
            await this.scrapeRecursively(page, this.startUrl);

            // Save results to JSON
            await this.saveResults();
            Logger.info(`Scraping completed! Results saved to ${this.outputFile}`);

        } catch (error) {
            Logger.error(`Error during scraping: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Check if page contains an ACTIVE CAPTCHA
     */
    async checkForCaptcha(page) {
        try {
            // Check for visible and active CAPTCHA elements
            const activeCaptchaSelectors = [
                'iframe[src*="recaptcha"]:not([style*="display: none"])',
                'div[class*="g-recaptcha"]:not([style*="display: none"])',
                'div[id*="recaptcha"]:not([style*="display: none"])',
                'div.captcha-container:not([style*="display: none"])',
                'form[action*="captcha"]'
            ];

            for (const selector of activeCaptchaSelectors) {
                try {
                    const captchaElement = await page.$(selector);
                    if (captchaElement) {
                        const isVisible = await page.evaluate(element => {
                            return element.offsetParent !== null;
                        }, captchaElement);
                        if (isVisible) {
                            Logger.warning(`🚨 Active CAPTCHA detected with selector: ${selector}`);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Check for CAPTCHA challenge pages (more specific keywords)
            try {
                const title = await page.title();
                const url = page.url();

                // More specific CAPTCHA indicators
                const captchaIndicators = [
                    title.toLowerCase().includes('security check'),
                    title.toLowerCase().includes('verify you are human'),
                    title.toLowerCase().includes('captcha') && title.toLowerCase().includes('challenge'),
                    title.toLowerCase().includes('bot protection'),
                    url.toLowerCase().includes('/captcha'),
                    title.toLowerCase().includes('cloudflare') && title.toLowerCase().includes('checking')
                ];

                if (captchaIndicators.some(indicator => indicator)) {
                    Logger.warning(`🚨 CAPTCHA challenge page detected - Title: ${title}`);
                    return true;
                }
            } catch (e) {
                // Continue
            }

            // Check for specific CAPTCHA challenge text in visible content
            try {
                const visibleText = await page.evaluate(() => document.body.innerText);
                if (visibleText) {
                    const challengePhrases = [
                        'verify you are not a robot',
                        'prove you are human',
                        'complete the security check',
                        'i am not a robot',
                        'please verify that you are a human'
                    ];

                    const visibleLower = visibleText.toLowerCase();
                    for (const phrase of challengePhrases) {
                        if (visibleLower.includes(phrase)) {
                            Logger.warning(`🚨 CAPTCHA challenge text detected: ${phrase}`);
                            return true;
                        }
                    }
                }
            } catch (e) {
                // Continue
            }

        } catch (error) {
            Logger.debug(`Error in CAPTCHA detection: ${error.message}`);
        }

        return false;
    }

    /**
     * Handle CAPTCHA by prompting user for manual intervention
     */
    async handleCaptcha(page, url) {
        Logger.warning("============================================================");
        Logger.warning("🚨 CAPTCHA DETECTED!");
        Logger.warning(`URL: ${url}`);
        Logger.warning(`Page Title: ${await page.title()}`);
        Logger.warning("============================================================");

        if (!BROWSER_SETTINGS.headless) {
            Logger.info("👀 Browser window is visible. Please solve the CAPTCHA manually.");
            Logger.info("⏳ Waiting for you to solve the CAPTCHA...");
            Logger.info("💡 The script will automatically continue once CAPTCHA is solved.");
            Logger.info("🔄 Checking every 3 seconds...");
            Logger.info("⌨️  Or press Ctrl+C to skip this page and continue...");

            // Wait for CAPTCHA to be solved (check every 3 seconds for faster response)
            const maxWaitTime = 180000; // 3 minutes maximum
            let waitTime = 0;

            while (waitTime < maxWaitTime) {
                await this.sleep(3000);
                waitTime += 3000;

                // Check if CAPTCHA is still present
                if (!(await this.checkForCaptcha(page))) {
                    Logger.info("✅ CAPTCHA appears to be solved! Continuing...");
                    await this.sleep(2000); // Small delay to ensure page loads
                    return true;
                }

                if (waitTime % 15000 === 0) { // Log every 15 seconds instead of every 3
                    Logger.info(`⏳ Still waiting... (${waitTime / 1000}s/${maxWaitTime / 1000}s)`);
                }
            }

            Logger.error("❌ Timeout waiting for CAPTCHA to be solved");
            return false;
        } else {
            Logger.error("❌ Running in headless mode - cannot solve CAPTCHA manually");
            Logger.info("💡 Try setting headless: false in config.js");
            return false;
        }
    }

    /**
     * Recursively scrape pages following 'view all' buttons
     */
    async scrapeRecursively(page, url, depth = 0) {
        if (this.visitedUrls.has(url) || depth > ADVANCED.maxDepth) {
            if (depth > ADVANCED.maxDepth) {
                Logger.warning(`Maximum depth ${ADVANCED.maxDepth} reached for URL: ${url}`);
            } else {
                Logger.info(`URL already visited: ${url}`);
            }
            return;
        }

        this.visitedUrls.add(url);
        Logger.info(`${'  '.repeat(depth)}Visiting: ${url}`);

        // Rate limiting
        await this.sleep(RATE_LIMIT.delayBetweenPages);

        try {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: BROWSER_SETTINGS.timeout });
            await this.sleep(PAGE_SETTINGS.waitForLoad);

            // Check for CAPTCHA
            if (await this.checkForCaptcha(page)) {
                Logger.info("🔍 CAPTCHA detected, initiating handling process...");
                if (!(await this.handleCaptcha(page, url))) {
                    Logger.warning(`⏭️  Skipping URL due to unresolved CAPTCHA: ${url}`);
                    return;
                } else {
                    Logger.info("✅ CAPTCHA resolved, continuing with scraping...");
                    // Wait a bit more for page to fully load after CAPTCHA resolution
                    await this.sleep(3000);
                }
            }

            // Look for "view all" buttons using configured selectors
            const viewAllButtons = [];
            for (const selector of SELECTORS.viewAllButtons) {
                const buttons = await page.$$(selector);
                viewAllButtons.push(...buttons);
            }

            if (viewAllButtons.length > 0) {
                Logger.info(`${'  '.repeat(depth)}Found ${viewAllButtons.length} 'view all' buttons`);

                // Extract URLs from all "view all" buttons
                const viewAllUrls = [];
                for (const button of viewAllButtons) {
                    const href = await page.evaluate(element => element.getAttribute('href'), button);
                    if (href) {
                        const fullUrl = new URL(href, this.baseUrl).href;
                        viewAllUrls.push(fullUrl);
                    }
                }

                // Visit each "view all" page recursively
                for (const viewAllUrl of viewAllUrls) {
                    await this.scrapeRecursively(page, viewAllUrl, depth + 1);
                }
            } else {
                // No "view all" buttons found, look for video/watch buttons
                Logger.info(`${'  '.repeat(depth)}No 'view all' buttons found. Looking for video links...`);
                await this.extractVideoLinks(page, depth);
            }

        } catch (error) {
            Logger.error(`Error processing URL ${url}: ${error.message}`);
        }
    }

    /**
     * Extract video links from the current page
     */
    async extractVideoLinks(page, depth = 0) {
        try {
            // Look for video card links using configured selectors
            const videoLinks = [];
            for (const selector of SELECTORS.videoLinks) {
                const links = await page.$$(selector);
                for (const link of links) {
                    const href = await page.evaluate(element => element.getAttribute('href'), link);
                    const title = await page.evaluate(element => element.getAttribute('title'), link);
                    if (href) {
                        const fullUrl = new URL(href, this.baseUrl).href;
                        videoLinks.push({
                            url: fullUrl,
                            title: title || 'Unknown Title'
                        });
                    }
                }
            }

            if (videoLinks.length > 0) {
                Logger.info(`${'  '.repeat(depth)}Found ${videoLinks.length} video links`);

                // Visit each video page to extract MP3 download links
                for (const videoLink of videoLinks) {
                    await this.extractMp3FromVideoPage(page, videoLink, depth + 1);
                }
            } else {
                Logger.info(`${'  '.repeat(depth)}No video links found on this page`);
            }

        } catch (error) {
            Logger.error(`Error extracting video links: ${error.message}`);
        }
    }

    /**
     * Extract MP3 download link and metadata from a video page
     */
    async extractMp3FromVideoPage(page, videoLink, depth = 0) {
        const videoUrl = videoLink.url;

        if (this.visitedUrls.has(videoUrl)) {
            return;
        }

        this.visitedUrls.add(videoUrl);
        Logger.info(`${'  '.repeat(depth)}Checking video page: ${videoUrl}`);

        // Rate limiting for download checks
        await this.sleep(RATE_LIMIT.delayBetweenDownloads);

        try {
            await page.goto(videoUrl, { waitUntil: 'networkidle0', timeout: BROWSER_SETTINGS.timeout });
            await this.sleep(PAGE_SETTINGS.waitForDownload);

            // Look for MP3 download button using configured selectors
            let downloadLink = null;
            for (const selector of SELECTORS.downloadLinks) {
                try {
                    const downloadElement = await page.$(selector);
                    if (downloadElement) {
                        const href = await page.evaluate(element => element.getAttribute('href'), downloadElement);
                        if (href) {
                            downloadLink = new URL(href, this.baseUrl).href;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            if (downloadLink) {
                Logger.info(`${'  '.repeat(depth)}Found MP3 download link!`);

                // Extract metadata
                const metadata = await this.extractMetadata(page);

                // Store the data
                const mp3Data = {
                    videoUrl: videoUrl,
                    downloadUrl: downloadLink,
                    metadata: metadata,
                    scrapedAt: new Date().toISOString()
                };

                this.scrapedData.push(mp3Data);
                Logger.info(`${'  '.repeat(depth)}Saved MP3 data: ${metadata.title || 'Unknown Title'}`);
            } else {
                Logger.info(`${'  '.repeat(depth)}No MP3 download link found, checking for nested video links...`);
                
                // Look for additional video links on this page
                await this.checkNestedVideoLinks(page, videoUrl, depth);
            }

        } catch (error) {
            Logger.error(`Error processing video page ${videoUrl}: ${error.message}`);
        }
    }

    /**
     * Check for nested video links on the current page when no download link is found
     */
    async checkNestedVideoLinks(page, currentVideoUrl, depth = 0) {
        try {
            Logger.info(`${'  '.repeat(depth)}Scanning for nested video links on: ${currentVideoUrl}`);

            // Look for additional video links on this page using the same selectors
            const nestedVideoLinks = [];
            for (const selector of SELECTORS.videoLinks) {
                const links = await page.$$(selector);
                for (const link of links) {
                    const href = await page.evaluate(element => element.getAttribute('href'), link);
                    const title = await page.evaluate(element => element.getAttribute('title'), link);
                    if (href) {
                        const fullUrl = new URL(href, this.baseUrl).href;
                        
                        // Don't revisit the same URL we're already on
                        if (fullUrl !== currentVideoUrl && !this.visitedUrls.has(fullUrl)) {
                            nestedVideoLinks.push({
                                url: fullUrl,
                                title: title || 'Unknown Title'
                            });
                        }
                    }
                }
            }

            if (nestedVideoLinks.length > 0) {
                Logger.info(`${'  '.repeat(depth)}Found ${nestedVideoLinks.length} nested video link(s)`);

                // Visit each nested video link to look for download buttons
                for (const nestedVideo of nestedVideoLinks) {
                    Logger.info(`${'  '.repeat(depth + 1)}Checking nested video: ${nestedVideo.title}`);
                    await this.extractMp3FromVideoPage(page, nestedVideo, depth + 1);
                }
            } else {
                Logger.info(`${'  '.repeat(depth)}No nested video links found`);
            }

        } catch (error) {
            Logger.error(`Error checking nested video links: ${error.message}`);
        }
    }

    /**
     * Extract metadata from the video page using configured selectors
     */
    async extractMetadata(page) {
        const metadata = {};

        try {
            // Extract title
            for (const selector of SELECTORS.metadata.title) {
                try {
                    const titleElement = await page.$(selector);
                    if (titleElement) {
                        const titleText = await page.evaluate(element => element.innerText, titleElement);
                        if (titleText && titleText.trim()) {
                            metadata.title = titleText.trim();
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Extract author
            for (const selector of SELECTORS.metadata.author) {
                try {
                    const authorElement = await page.$(selector);
                    if (authorElement) {
                        const authorText = await page.evaluate(element => element.innerText, authorElement);
                        metadata.author = authorText.trim();
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Extract topics
            for (const selector of SELECTORS.metadata.topics) {
                try {
                    const topicLinks = await page.$$(selector);
                    const topics = [];
                    for (const link of topicLinks) {
                        const topicText = await page.evaluate(element => element.innerText, link);
                        if (topicText) {
                            topics.push(topicText.trim());
                        }
                    }
                    if (topics.length > 0) {
                        metadata.topics = topics;
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Extract podcast information
            for (const selector of SELECTORS.metadata.podcast) {
                try {
                    const podcastElement = await page.$(selector);
                    if (podcastElement) {
                        const podcastText = await page.evaluate(element => element.innerText, podcastElement);
                        metadata.podcast = podcastText.trim();
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Extract synopsis
            for (const selector of SELECTORS.metadata.synopsis) {
                try {
                    const synopsisElement = await page.$(selector);
                    if (synopsisElement) {
                        const synopsisText = await page.evaluate(element => element.innerText, synopsisElement);
                        if (synopsisText && synopsisText.trim()) {
                            metadata.synopsis = synopsisText.trim();
                            break;
                        }
                    }
                } catch (e) {
                    // Continue
                }
            }

        } catch (error) {
            Logger.error(`Error extracting metadata: ${error.message}`);
        }

        return metadata;
    }

    /**
     * Save scraped results to JSON file
     */
    async saveResults() {
        try {
            const results = {
                scrapedCount: this.scrapedData.length,
                startUrl: this.startUrl,
                scrapedAt: new Date().toISOString(),
                data: this.scrapedData
            };

            await fs.writeFile(this.outputFile, JSON.stringify(results, null, 2), 'utf8');
            Logger.info(`Successfully saved ${this.scrapedData.length} MP3 entries to ${this.outputFile}`);

        } catch (error) {
            Logger.error(`Error saving results: ${error.message}`);
        }
    }

    /**
     * Sleep utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Create and run scraper with configuration from config.js
        const scraper = new ChabadMP3Scraper();
        await scraper.run();
    } catch (error) {
        Logger.error(`Main execution error: ${error.message}`);
        process.exit(1);
    }
}

// Run the scraper if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { ChabadMP3Scraper, Logger }; 