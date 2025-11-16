/**
 * Paginated Chabad MP3 Scraper with Full Metadata Extraction
 * 
 * Two-Phase Process:
 * 1. PHASE 1: Collect all video URLs across multiple pages using pagination
 * 2. PHASE 2: Visit each video URL to extract complete metadata and download links
 * 
 * Output format matches mp3_scraper.js:
 * { videoUrl, downloadUrl, metadata: { title, author, topics, podcast, synopsis }, scrapedAt }
 */

const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class PaginatedChabadScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allVideoData = [];
        this.processedPages = 0;
        this.totalFound = 0;
    }

    /**
     * Initialize browser session
     */
    async initializeBrowser() {
        console.log('🌐 Initializing browser session...');
        
        try {
            const response = await connect({
                headless: config.BROWSER_SETTINGS.headless,
                turnstile: true,
                fingerprint: true
            });
            
            this.browser = response.browser;
            this.page = response.page;
            
            // Set user agent and viewport
            await this.page.setUserAgent(config.ADVANCED.userAgent);
            await this.page.setViewport(config.ADVANCED.viewport);
            
            console.log('✅ Browser session initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error.message);
            throw error;
        }
    }

    /**
     * Navigate to start URL
     */
    async navigateToStart(startUrl) {
        console.log(`🔗 Navigating to: ${startUrl}`);
        
        try {
            await this.page.goto(startUrl, {
                waitUntil: 'networkidle2',
                timeout: config.BROWSER_SETTINGS.timeout
            });
            
            // Wait for page to fully load
            await new Promise(resolve => setTimeout(resolve, config.PAGE_SETTINGS.waitForLoad));
            
            console.log('✅ Start page loaded successfully');
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to navigate to start URL: ${error.message}`);
            throw error;
        }
    }

    /**
     * Scrape video links from current page
     */
    async scrapeCurrentPage() {
        console.log(`📄 Scraping page ${this.processedPages + 1}...`);
        
        try {
            // Wait for video links to load
            await this.page.waitForSelector('a[class*="watch-link"]', { 
                timeout: 10000 
            }).catch(() => {
                console.log('   ⚠️ No video links found with primary selector, trying alternatives...');
            });

            // Extract video links using config selectors
            const videoLinks = await this.page.evaluate((baseUrl, selectors) => {
                const links = [];
                const processedUrls = new Set();
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    
                    for (const element of elements) {
                        const href = element.getAttribute('href');
                        if (href && href.includes('/aid/')) {
                            const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                            
                            if (!processedUrls.has(fullUrl)) {
                                processedUrls.add(fullUrl);
                                links.push({
                                    url: fullUrl,
                                    foundAt: new Date().toISOString()
                                });
                            }
                        }
                    }
                }
                
                return links;
            }, config.BASE_URL, config.SELECTORS.videoLinks);

            console.log(`   📊 Found ${videoLinks.length} video links on this page`);
            
            // Add to collection
            this.allVideoData.push(...videoLinks);
            this.totalFound += videoLinks.length;
            this.processedPages++;
            
            return videoLinks;
            
        } catch (error) {
            console.error(`   ❌ Error scraping page: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract MP3 data from individual video page (Phase 2: Metadata Extraction)
     */
    async extractMp3FromVideoPage(videoUrl, index) {
        console.log(`[${index}] 🎬 Extracting metadata from: ${videoUrl}`);
        
        try {
            // Navigate to video page
            await this.page.goto(videoUrl, { 
                waitUntil: 'networkidle2', 
                timeout: config.BROWSER_SETTINGS.timeout 
            });
            
            await new Promise(resolve => setTimeout(resolve, config.PAGE_SETTINGS.waitForDownload));

            // Look for MP3 download link using config selectors
            let downloadLink = null;
            for (const selector of config.SELECTORS.downloadLinks) {
                try {
                    const downloadElement = await this.page.$(selector);
                    if (downloadElement) {
                        const href = await this.page.evaluate(element => element.getAttribute('href'), downloadElement);
                        if (href) {
                            downloadLink = href.startsWith('http') ? href : config.BASE_URL + href;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            if (downloadLink) {
                console.log(`[${index}] ✅ Found download link!`);

                // Extract metadata using config selectors
                const metadata = await this.extractMetadata();

                // Create MP3 data object (same format as mp3_scraper.js)
                const mp3Data = {
                    videoUrl: videoUrl,
                    downloadUrl: downloadLink,
                    metadata: metadata,
                    scrapedAt: new Date().toISOString()
                };

                console.log(`[${index}] 📊 Metadata: ${metadata.title || 'Unknown Title'}`);
                return mp3Data;
                
            } else {
                console.log(`[${index}] ❌ No download link found`);
                return null;
            }

        } catch (error) {
            console.error(`[${index}] ❌ Error extracting from ${videoUrl}: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract metadata from video page using config selectors
     */
    async extractMetadata() {
        const metadata = {};

        try {
            // Extract title
            for (const selector of config.SELECTORS.metadata.title) {
                try {
                    const titleElement = await this.page.$(selector);
                    if (titleElement) {
                        const titleText = await this.page.evaluate(element => element.innerText, titleElement);
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
            for (const selector of config.SELECTORS.metadata.author) {
                try {
                    const authorElement = await this.page.$(selector);
                    if (authorElement) {
                        const authorText = await this.page.evaluate(element => element.innerText, authorElement);
                        if (authorText && authorText.trim()) {
                            metadata.author = authorText.trim();
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Extract topics
            for (const selector of config.SELECTORS.metadata.topics) {
                try {
                    const topicLinks = await this.page.$$(selector);
                    const topics = [];
                    for (const link of topicLinks) {
                        const topicText = await this.page.evaluate(element => element.innerText, link);
                        if (topicText && topicText.trim()) {
                            topics.push(topicText.trim());
                        }
                    }
                    if (topics.length > 0) {
                        metadata.topics = topics;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Extract podcast information
            for (const selector of config.SELECTORS.metadata.podcast) {
                try {
                    const podcastElement = await this.page.$(selector);
                    if (podcastElement) {
                        const podcastText = await this.page.evaluate(element => element.innerText, podcastElement);
                        if (podcastText && podcastText.trim()) {
                            metadata.podcast = podcastText.trim();
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Extract synopsis
            for (const selector of config.SELECTORS.metadata.synopsis) {
                try {
                    const synopsisElement = await this.page.$(selector);
                    if (synopsisElement) {
                        const synopsisText = await this.page.evaluate(element => element.innerText, synopsisElement);
                        if (synopsisText && synopsisText.trim()) {
                            metadata.synopsis = synopsisText.trim();
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

        } catch (error) {
            console.error(`Error extracting metadata: ${error.message}`);
        }

        return metadata;
    }

    /**
     * Check if next button exists and is enabled
     */
    async hasEnabledNextButton() {
        try {
            const nextButtonInfo = await this.page.evaluate(() => {
                // Look for next button image
                const nextImages = document.querySelectorAll('img.nextPage');
                
                for (const img of nextImages) {
                    const isDisabled = img.classList.contains('disabled');
                    const parentLink = img.closest('a');
                    
                    return {
                        exists: true,
                        disabled: isDisabled,
                        hasLink: !!parentLink,
                        linkHref: parentLink ? parentLink.href : null
                    };
                }
                
                // Also check for text-based next buttons
                const nextLinks = document.querySelectorAll('a[href*="page"], a[title*="next" i], a[title*="more" i]');
                for (const link of nextLinks) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes('next') || text.includes('more') || text.includes('>')) {
                        return {
                            exists: true,
                            disabled: false,
                            hasLink: true,
                            linkHref: link.href,
                            isTextButton: true
                        };
                    }
                }
                
                return { exists: false, disabled: true };
            });

            console.log(`   🔍 Next button check: exists=${nextButtonInfo.exists}, disabled=${nextButtonInfo.disabled}`);
            
            return nextButtonInfo.exists && !nextButtonInfo.disabled;
            
        } catch (error) {
            console.log(`   ⚠️ Error checking next button: ${error.message}`);
            return false;
        }
    }

    /**
     * Click next button to go to next page
     */
    async clickNextButton() {
        try {
            console.log(`   ➡️ Clicking next button...`);
            
            const clicked = await this.page.evaluate(() => {
                // Try to find and click next button
                const nextImages = document.querySelectorAll('img.nextPage:not(.disabled)');
                
                for (const img of nextImages) {
                    const parentLink = img.closest('a');
                    if (parentLink) {
                        parentLink.click();
                        return true;
                    }
                }
                
                // Fallback: try text-based next buttons
                const nextLinks = document.querySelectorAll('a[href*="page"], a[title*="next" i]');
                for (const link of nextLinks) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes('next') || text.includes('more') || text.includes('>')) {
                        link.click();
                        return true;
                    }
                }
                
                return false;
            });

            if (!clicked) {
                console.log('   ❌ Could not find clickable next button');
                return false;
            }

            // Wait for navigation
            await Promise.race([
                this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                new Promise(resolve => setTimeout(resolve, 5000)) // Fallback timeout
            ]);

            // Additional wait for page to stabilize
            await new Promise(resolve => setTimeout(resolve, config.PAGE_SETTINGS.waitForLoad));
            
            console.log('   ✅ Successfully navigated to next page');
            return true;
            
        } catch (error) {
            console.error(`   ❌ Error clicking next button: ${error.message}`);
            return false;
        }
    }

    /**
     * Process all pages with pagination and extract metadata
     */
    async processAllPages(startUrl) {
        console.log('🚀 Starting paginated scraping...');
        console.log(`📍 Start URL: ${startUrl}`);
        console.log('');
        
        try {
            // PHASE 1: Collect all video URLs across pages
            console.log('📋 PHASE 1: Collecting video URLs from all pages...');
            await this.collectAllVideoUrls(startUrl);
            
            console.log('');
            console.log(`🎯 Found ${this.allVideoData.length} total video URLs across ${this.processedPages} pages`);
            console.log('');
            
            // PHASE 2: Extract metadata from each video URL
            console.log('🔍 PHASE 2: Extracting metadata from each video...');
            await this.extractMetadataFromAllVideos();
            
        } catch (error) {
            console.error('❌ Error during processing:', error.message);
            throw error;
        }
    }

    /**
     * Phase 1: Collect all video URLs through pagination
     */
    async collectAllVideoUrls(startUrl) {
        // Navigate to first page
        await this.navigateToStart(startUrl);
        
        let hasMorePages = true;
        let maxPages = 50; // Safety limit
        
        while (hasMorePages && this.processedPages < maxPages) {
            // Scrape current page
            await this.scrapeCurrentPage();
            
            // Progress update
            console.log(`📊 Phase 1 Progress: ${this.processedPages} pages processed, ${this.totalFound} total videos found`);
            
            // Check for next button
            hasMorePages = await this.hasEnabledNextButton();
            
            if (hasMorePages) {
                // Click next and continue
                const nextSuccess = await this.clickNextButton();
                if (!nextSuccess) {
                    console.log('⚠️ Failed to navigate to next page, stopping...');
                    break;
                }
                
                // Brief pause between pages
                await new Promise(resolve => setTimeout(resolve, config.RATE_LIMIT.delayBetweenPages));
            } else {
                console.log('🏁 No more pages to process (next button disabled or missing)');
            }
        }
        
        if (this.processedPages >= maxPages) {
            console.log(`⚠️ Reached maximum page limit (${maxPages})`);
        }
    }

    /**
     * Phase 2: Extract metadata from all collected video URLs
     */
    async extractMetadataFromAllVideos() {
        const extractedData = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < this.allVideoData.length; i++) {
            const videoData = this.allVideoData[i];
            const index = i + 1;
            
            try {
                const mp3Data = await this.extractMp3FromVideoPage(videoData.url, index);
                
                if (mp3Data) {
                    extractedData.push(mp3Data);
                    successCount++;
                } else {
                    failCount++;
                }
                
                // Progress update
                if (index % 10 === 0 || index === this.allVideoData.length) {
                    console.log(`📊 Phase 2 Progress: ${index}/${this.allVideoData.length} videos processed (✅ ${successCount} success, ❌ ${failCount} failed)`);
                }
                
                // Rate limiting between video page visits
                await new Promise(resolve => setTimeout(resolve, config.RATE_LIMIT.delayBetweenDownloads));
                
            } catch (error) {
                console.error(`[${index}] ❌ Failed to extract: ${error.message}`);
                failCount++;
            }
        }

        // Replace allVideoData with extracted MP3 data
        this.allVideoData = extractedData;
        
        console.log('');
        console.log(`🎉 Phase 2 Complete: ${successCount} MP3s extracted, ${failCount} failed`);
    }

    /**
     * Save scraped data to file (same format as mp3_scraper.js)
     */
    async saveScrapedData() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = `paginated_mp3s_${timestamp}.json`;
        
        const scrapedData = {
            scrapedCount: this.allVideoData.length,
            pagesProcessed: this.processedPages,
            startUrl: 'Paginated scraping across multiple pages',
            scrapedAt: new Date().toISOString(),
            data: this.allVideoData
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2));
        
        console.log('');
        console.log('📄 Results Summary:');
        console.log('==================');
        console.log(`📊 Total pages processed: ${this.processedPages}`);
        console.log(`🎵 Total MP3s with metadata: ${this.allVideoData.length}`);
        console.log(`💾 Data saved to: ${outputFile}`);
        console.log('');
        console.log('📋 Sample MP3 data structure:');
        if (this.allVideoData.length > 0) {
            console.log('   - videoUrl: Video page URL');
            console.log('   - downloadUrl: Direct MP3 download link');
            console.log('   - metadata: { title, author, topics, podcast, synopsis }');
            console.log('   - scrapedAt: Timestamp');
        }
        
        return outputFile;
    }

    /**
     * Clean up browser resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🌐 Browser session closed');
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    // Get start URL from command line or use default Tanya page
    const startUrl = process.argv[2] || 'https://www.chabad.org/library/tanya/tanya_cdo/aid/983056/jewish/Shaar-Hayichud-Vehaemunah.htm';
    
    const scraper = new PaginatedChabadScraper();
    
    try {
        console.log('🎯 PAGINATED CHABAD SCRAPER');
        console.log('============================');
        console.log('');
        
        // Initialize browser
        await scraper.initializeBrowser();
        
        // Process all pages
        await scraper.processAllPages(startUrl);
        
        // Save results
        await scraper.saveScrapedData();
        
        console.log('');
        console.log('🎉 SCRAPING COMPLETE!');
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    } finally {
        await scraper.cleanup();
    }
}

// Export for use as module
module.exports = { PaginatedChabadScraper };

// Run if called directly
if (require.main === module) {
    main();
} 