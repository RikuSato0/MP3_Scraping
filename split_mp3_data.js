/**
 * Script to split scraped_mp3s.json into chunks of 50 video links each
 * This helps with processing smaller batches during upload
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = 'scraped_mp3s.json';
const OUTPUT_DIR = './chunks';
const CHUNK_SIZE = 50;

/**
 * Split the MP3 data into smaller chunks
 */
async function splitMp3Data() {
    try {
        console.log('🔪 Starting MP3 data splitting...');
        
        // Read the original file
        console.log(`📖 Reading ${INPUT_FILE}...`);
        const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
        const originalData = JSON.parse(rawData);
        
        console.log(`📊 Found ${originalData.scrapedCount} total MP3 entries`);
        console.log(`📅 Original scrape date: ${originalData.scrapedAt}`);
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
        }
        
        // Split data into chunks
        const allEntries = originalData.data;
        const totalChunks = Math.ceil(allEntries.length / CHUNK_SIZE);
        
        console.log(`✂️ Splitting into ${totalChunks} chunks of ${CHUNK_SIZE} entries each`);
        console.log('');
        
        const chunkFiles = [];
        
        for (let i = 0; i < totalChunks; i++) {
            const startIndex = i * CHUNK_SIZE;
            const endIndex = Math.min(startIndex + CHUNK_SIZE, allEntries.length);
            const chunkData = allEntries.slice(startIndex, endIndex);
            
            // Create chunk file
            const chunkFileName = `scraped_mp3s_chunk_${String(i + 1).padStart(2, '0')}.json`;
            const chunkFilePath = path.join(OUTPUT_DIR, chunkFileName);
            
            const chunkContent = {
                chunkNumber: i + 1,
                totalChunks: totalChunks,
                chunkSize: chunkData.length,
                originalScrapedCount: originalData.scrapedCount,
                originalStartUrl: originalData.startUrl,
                originalScrapedAt: originalData.scrapedAt,
                splitAt: new Date().toISOString(),
                startIndex: startIndex,
                endIndex: endIndex - 1,
                data: chunkData
            };
            
            fs.writeFileSync(chunkFilePath, JSON.stringify(chunkContent, null, 2));
            chunkFiles.push(chunkFileName);
            
            console.log(`✅ Created ${chunkFileName}: ${chunkData.length} entries (${startIndex + 1}-${endIndex})`);
        }
        
        // Create index file listing all chunks
        const indexFile = {
            originalFile: INPUT_FILE,
            totalEntries: originalData.scrapedCount,
            chunkSize: CHUNK_SIZE,
            totalChunks: totalChunks,
            splitAt: new Date().toISOString(),
            originalScrapedAt: originalData.scrapedAt,
            chunks: chunkFiles.map((fileName, index) => ({
                fileName: fileName,
                chunkNumber: index + 1,
                startIndex: index * CHUNK_SIZE,
                endIndex: Math.min((index + 1) * CHUNK_SIZE - 1, originalData.scrapedCount - 1),
                entryCount: Math.min(CHUNK_SIZE, originalData.scrapedCount - (index * CHUNK_SIZE))
            }))
        };
        
        const indexFilePath = path.join(OUTPUT_DIR, 'chunks_index.json');
        fs.writeFileSync(indexFilePath, JSON.stringify(indexFile, null, 2));
        
        console.log('');
        console.log('🎉 SPLITTING COMPLETE!');
        console.log('=====================');
        console.log(`📁 Output directory: ${OUTPUT_DIR}`);
        console.log(`📄 Total chunks created: ${totalChunks}`);
        console.log(`📋 Index file: chunks_index.json`);
        console.log('');
        console.log('📁 Generated Files:');
        chunkFiles.forEach(file => console.log(`   - ${file}`));
        console.log(`   - chunks_index.json (index file)`);
        console.log('');
        console.log('💡 You can now process each chunk separately with your uploader!');
        
        return {
            totalChunks,
            chunkFiles,
            outputDir: OUTPUT_DIR
        };
        
    } catch (error) {
        console.error('❌ Error splitting MP3 data:', error.message);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        const result = await splitMp3Data();
        
        console.log('');
        console.log('🔧 Usage Examples:');
        console.log('==================');
        console.log('');
        console.log('To process a specific chunk with your uploader:');
        console.log(`node authenticated_uploader_with_login.js chunks/scraped_mp3s_chunk_01.json`);
        console.log('');
        console.log('To process all chunks in sequence:');
        console.log('for i in {01..21}; do node authenticated_uploader_with_login.js chunks/scraped_mp3s_chunk_$i.json; done');
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { splitMp3Data }; 