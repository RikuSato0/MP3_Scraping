/**
 * Configuration file for Chabad MP3 Scraper
 * Modify these settings to customize the scraper behavior
 */

// Starting URL for scraping
const START_URL = "https://www.chabad.org/multimedia/video_cdo/aid/1779405/jewish/Rambam-With-Rabbi-Gordon.htm";

// Output file for scraped data
const OUTPUT_FILE = "scraped_mp3s.json";

// Browser settings
const BROWSER_SETTINGS = {
    headless: false,  // IMPORTANT: Keep false to handle CAPTCHAs manually
    slowMo: 1000,     // Milliseconds to slow down operations (helps avoid detection)
    timeout: 30000,   // Default timeout in milliseconds
};

// Page load settings
const PAGE_SETTINGS = {
    waitForLoad: 2000,     // Milliseconds to wait after page load
    waitForDownload: 3000, // Milliseconds to wait when checking download pages
    maxRetries: 3,         // Maximum retries for failed page loads
};

// CSS Selectors for different elements
const SELECTORS = {
    viewAllButtons: [
        "a.vs-video-row__header__more-link"
    ],
    
    videoLinks: [
        "a.watch-link",
        "a.vs-video-card__link-wrapper",
        "a#LinkWrapper"
    ],
    
    downloadLinks: [
        "a[href*='/multimedia/filedownload_cdo/']:has-text('Download this MP3')",
        "a.inline_block[href*='/multimedia/filedownload_cdo/']",
        "a[href*='filedownload']"
    ],
    
    metadata: {
        title: [
            "h1.article-header__title",
            "h2",
            ".js-article-title",
            "title"
        ],
        author: [
            "span.article-header__byline a",
            ".article-header__byline a"
        ],
        topics: [
            "tr.topics a"
        ],
        podcast: [
            ".podcast_icon a"
        ],
        synopsis: [
            "#TitleAndSynopsis .normal",
            ".video_info .normal"
        ]
    }
};

// Base URL for the website
const BASE_URL = "https://www.chabad.org";

// Logging settings
const LOGGING_SETTINGS = {
    level: "INFO",  // Options: DEBUG, INFO, WARNING, ERROR
    logToFile: false,  // Set to true to also log to a file
    logFile: "scraper.log"
};

// Rate limiting settings (to be respectful to the website and avoid CAPTCHAs)
const RATE_LIMIT = {
    delayBetweenPages: 3000,     // Milliseconds to wait between page visits
    delayBetweenDownloads: 2000, // Milliseconds to wait between download checks
    maxConcurrentPages: 1,       // Maximum pages to process simultaneously
};

// Advanced settings
const ADVANCED = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    enableJavascript: true,
    ignoreHttpsErrors: false,
    viewport: { width: 1920, height: 1080 },
    maxDepth: 10,  // Maximum recursion depth for following "view all" links
};

module.exports = {
    START_URL,
    OUTPUT_FILE,
    BROWSER_SETTINGS,
    PAGE_SETTINGS,
    SELECTORS,
    BASE_URL,
    LOGGING_SETTINGS,
    RATE_LIMIT,
    ADVANCED
}; 