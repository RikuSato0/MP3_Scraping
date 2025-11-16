# Chabad MP3 Scraper

This project scrapes MP3 audio files and metadata from the Chabad.org website using **puppeteer-real-browser** for superior web automation and CAPTCHA handling.

## Features

- **Real Browser Automation**: Uses puppeteer-real-browser with advanced stealth features for undetectable scraping
- **CAPTCHA Handling**: Smart CAPTCHA detection with manual intervention support
- **Recursive Navigation**: Automatically follows "view all" buttons to discover all content pages
- **MP3 Detection**: Finds and extracts download links for MP3 files
- **Metadata Extraction**: Captures titles, authors, topics, podcast information, and other metadata
- **JSON Output**: Saves all scraped data in a structured JSON format
- **Duplicate Prevention**: Avoids visiting the same URL multiple times
- **Detailed Logging**: Provides comprehensive logging of the scraping process

## Installation

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Browser installation is automatic:
   - puppeteer-real-browser automatically downloads Chrome browser on first use
   - No manual browser installation required

## Usage

### Basic Usage

Run the scraper with the default configuration:

```bash
node mp3_scraper.js
```

This will:
- Start from the default URL: https://www.chabad.org/multimedia/video_cdo/aid/935151/jewish/Parshah-With-Rabbi-Gordon.htm
- Save results to `scraped_mp3s.json`

### Configuration

You can modify the following parameters in `config.js`:

```javascript
// Starting URL for scraping
const START_URL = "https://www.chabad.org/multimedia/video_cdo/aid/935151/jewish/Parshah-With-Rabbi-Gordon.htm";

// Output file for scraped data
const OUTPUT_FILE = "scraped_mp3s.json";

// Browser settings
const BROWSER_SETTINGS = {
    headless: false,  // IMPORTANT: Keep false to handle CAPTCHAs manually
    slowMo: 1000,     // Milliseconds to slow down operations
    timeout: 30000,   // Default timeout in milliseconds
};
```

### Browser Settings

- **Headless Mode**: Keep `headless=False` for CAPTCHA handling
- **Anti-Detection**: puppeteer-real-browser includes advanced stealth features and webdriver removal
- **Real Browser**: Uses actual Chrome browser for better compatibility

## CAPTCHA Handling

### Automatic Detection
The scraper detects CAPTCHAs using:
- Visible CAPTCHA element detection
- Challenge page identification
- Specific CAPTCHA text phrases

### Manual Solution
When a CAPTCHA is detected:
1. 🚨 **Alert**: Clear warning with URL and page title
2. 👀 **Visible Browser**: Window stays open for manual solving
3. ⏳ **Smart Waiting**: Checks every 3 seconds if solved
4. ✅ **Auto-Continue**: Resumes automatically when solved
5. ⌨️ **Skip Option**: Press Ctrl+C to skip problematic pages

## How It Works

1. **Starting Point**: Begins at the configured start URL
2. **Navigation Discovery**: Looks for "view all" buttons using CSS selectors
3. **Recursive Exploration**: Follows all "view all" links to discover more content
4. **Video Detection**: When no "view all" buttons are found, searches for video links
5. **MP3 Extraction**: Visits each video page to find MP3 download links
6. **Metadata Collection**: Extracts comprehensive metadata from each video page
7. **Data Storage**: Saves all information to a JSON file

## Output Format

The scraper generates a JSON file with the following structure:

```json
{
  "scraped_count": 10,
  "start_url": "https://www.chabad.org/multimedia/video_cdo/aid/935151/jewish/Parshah-With-Rabbi-Gordon.htm",
  "scraped_at": "2024-01-01T12:00:00.000000",
  "data": [
    {
      "video_url": "https://www.chabad.org/multimedia/video_cdo/aid/1164146/jewish/Rabbi-Gordon-Vayikra-3rd-Portion.htm",
      "download_url": "https://www.chabad.org/multimedia/filedownload_cdo/aid/1162834",
      "metadata": {
        "title": "Rabbi Gordon - Vayikra: 2nd Portion",
        "author": "Yehoshua B. Gordon",
        "topics": ["Vayikra", "Parshah"],
        "podcast": "Subscribe to Rabbi Gordon - Chumash",
        "synopsis": "Additional description if available"
      },
      "scraped_at": "2024-01-01T12:00:00.000000"
    }
  ]
}
```

## Logging

The scraper provides detailed logging information including:
- URLs being visited
- CAPTCHA detection and handling
- Number of "view all" buttons found
- Number of video links discovered
- MP3 download links found
- Metadata extraction status
- Error messages for troubleshooting

## Advantages of puppeteer-real-browser

### vs. Playwright/Python alternatives:
✅ **Advanced Stealth Features**: Professional-grade anti-detection mechanisms
✅ **No Browser Installation**: Automatic Chrome download and management
✅ **Superior CAPTCHA Handling**: Better success rate with challenges
✅ **Real User Simulation**: More natural browsing patterns
✅ **Cutting-edge Anti-Detection**: Latest stealth techniques and fingerprint masking

## Selectors Used

The scraper uses these CSS selectors to find elements:

- **View All Buttons**: `a.vs-video-row__header__more-link`
- **Video Links**: `a.vs-video-card__link-wrapper`, `a[id="LinkWrapper"]`, `a[href*="/multimedia/video_cdo/"]`
- **Download Links**: `a[href*="/multimedia/filedownload_cdo/"]:has-text("Download this MP3")`
- **Metadata Elements**: Various selectors for titles, authors, topics, etc.

## Troubleshooting

1. **No MP3s Found**: Check if the website structure has changed and update selectors in `config.js`
2. **Browser Issues**: puppeteer-real-browser handles Chrome installation automatically on first use
3. **CAPTCHA Problems**: Ensure `headless: false` in config for manual solving
4. **Rate Limiting**: Increase delays in `config.js` if the website blocks requests
5. **Module Errors**: Run `npm install` to install dependencies

## Testing

Run the test suite to verify everything is working:

```bash
node test_scraper.js
```

Tests include:
- puppeteer-real-browser installation
- Website accessibility
- Selector functionality
- Configuration validation

## Contributing

Feel free to modify the script for your specific needs:
- Add new metadata fields in `config.js`
- Adjust selectors for different website layouts
- Implement additional error handling
- Add download functionality for the MP3 files themselves

## Legal Notice

This scraper is for educational purposes. Always respect the website's robots.txt file and terms of service when scraping web content. Use reasonable delays and be respectful of server resources. 