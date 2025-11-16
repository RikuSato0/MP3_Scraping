# S3 Upload & RAG System Setup Guide

## 🎯 Overview

You currently have **425 MP3s scraped** and ready for upload. This guide will help you:

1. **Upload all MP3s to S3 bucket** with proper organization
2. **Generate RAG-optimized metadata** for AI analysis
3. **Create mapping files** to link MP3s with their metadata

## 🔧 Prerequisites

### 1. Install AWS SDK

```bash
npm install
```

This will install the `aws-sdk` dependency added to your `package.json`.

### 2. AWS Account Setup

You need an AWS account with S3 access. If you don't have one:
- Sign up at [aws.amazon.com](https://aws.amazon.com)
- Create an IAM user with S3 permissions
- Get your Access Key ID and Secret Access Key

### 3. Create S3 Bucket

1. Log into AWS Console → S3
2. Create a new bucket (e.g., `my-chabad-mp3-collection`)
3. Choose your preferred region (e.g., `us-east-1`)
4. Keep default settings for now

## ⚙️ Configuration

### 1. Set AWS Credentials

**Option A: Environment Variables (Recommended)**
```bash
# Windows (PowerShell)
$env:AWS_ACCESS_KEY_ID="your_access_key_here"
$env:AWS_SECRET_ACCESS_KEY="your_secret_key_here"
$env:AWS_REGION="us-east-1"
$env:S3_BUCKET_NAME="your-bucket-name"

# Linux/Mac
export AWS_ACCESS_KEY_ID="your_access_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_key_here"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-bucket-name"
```

**Option B: Edit Script Directly**
Modify the config section in `s3_uploader.js`:
```javascript
const config = {
    aws: {
        accessKeyId: 'your_access_key_here',
        secretAccessKey: 'your_secret_key_here',
        region: 'us-east-1',
        bucketName: 'your-bucket-name'
    },
    // ... rest of config
};
```

### 2. S3 Bucket Organization

Your MP3s will be organized as:
```
your-bucket/
├── rabbi-gordon-classes/
│   ├── 0001-rabbi-gordon-bereishit-1st-portion.mp3
│   ├── 0002-rabbi-gordon-bereishit-2nd-portion.mp3
│   └── ...
└── metadata/
    ├── rag_metadata_2025-07-23.json
    ├── upload_log_2025-07-23.json
    └── mp3_s3_mapping_2025-07-23.json
```

## 🚀 Running the Upload

### 1. Test Connection (Optional)

First, verify your AWS credentials work:
```bash
node -e "const AWS = require('aws-sdk'); const s3 = new AWS.S3(); s3.listBuckets((err, data) => { if (err) console.error('❌ Error:', err.message); else console.log('✅ AWS connection successful!'); });"
```

### 2. Start Upload Process

```bash
node s3_uploader.js
```

This will:
- Download each MP3 from Chabad.org
- Upload to your S3 bucket with metadata
- Generate RAG-optimized metadata files
- Create progress logs

### 3. Monitor Progress

The upload will show real-time progress:
```
🚀 Starting upload of 425 MP3s to S3...
📁 S3 Bucket: my-chabad-mp3-collection
🎯 Max concurrent uploads: 3

[1] Downloading: Rabbi Gordon - Bereishit: 1st Portion
[1] Uploading to S3: rabbi-gordon-classes/0001-rabbi-gordon-bereishit-1st-portion.mp3
[1] ✅ SUCCESS: Rabbi Gordon - Bereishit: 1st Portion

📊 Progress: 3/425 processed
✅ Uploaded: 3, ❌ Failed: 0
```

## 📊 Generated Files for RAG

After completion, you'll get 3 key files:

### 1. `rag_metadata_[timestamp].json`
**Complete RAG metadata with AI-optimized structure:**
```json
{
  "generatedAt": "2025-07-23T20:00:00.000Z",
  "totalFiles": 425,
  "s3Bucket": "my-chabad-mp3-collection",
  "metadata": [
    {
      "id": "chabad-mp3-0001",
      "content": {
        "title": "Rabbi Gordon - Bereishit: 1st Portion",
        "author": "Yehoshua B. Gordon",
        "topics": ["Bereishit", "Parshah"],
        "description": "Audio class by Yehoshua B. Gordon on Bereishit, Parshah"
      },
      "file": {
        "s3Bucket": "my-chabad-mp3-collection",
        "s3Key": "rabbi-gordon-classes/0001-rabbi-gordon-bereishit-1st-portion.mp3",
        "s3Url": "https://my-bucket.s3.amazonaws.com/rabbi-gordon-classes/0001-rabbi-gordon-bereishit-1st-portion.mp3",
        "fileType": "audio/mp3"
      },
      "source": {
        "originalUrl": "https://www.chabad.org/multimedia/video_cdo/aid/4886452/jewish/Rabbi-Gordon-Bereishit-1st-Portion.htm",
        "downloadUrl": "https://www.chabad.org/multimedia/filedownload_cdo/aid/4886663"
      },
      "rag": {
        "contentType": "audio_lecture",
        "category": "jewish_education",
        "subcategory": "torah_study",
        "language": "english",
        "searchableText": "rabbi gordon bereishit 1st portion yehoshua b. gordon bereishit parshah"
      }
    }
  ]
}
```

### 2. `upload_log_[timestamp].json`
**Upload process tracking:**
```json
{
  "summary": {
    "totalProcessed": 425,
    "successful": 423,
    "failed": 2,
    "successRate": "99.53%"
  },
  "uploadLog": [...]
}
```

### 3. `mp3_s3_mapping_[timestamp].json`
**Simple MP3 → S3 URL mapping:**
```json
[
  {
    "id": "chabad-mp3-0001",
    "title": "Rabbi Gordon - Bereishit: 1st Portion",
    "author": "Yehoshua B. Gordon",
    "s3Url": "https://...",
    "s3Key": "rabbi-gordon-classes/0001-..."
  }
]
```

## 🤖 Using with RAG/AI Systems

### For Vector Databases (Pinecone, Weaviate, etc.)

```javascript
// Load RAG metadata
const ragData = JSON.parse(fs.readFileSync('rag_metadata_[timestamp].json'));

// Each MP3 entry is optimized for vector search
ragData.metadata.forEach(item => {
    const vectorEntry = {
        id: item.id,
        text: item.rag.searchableText,
        metadata: {
            title: item.content.title,
            author: item.content.author,
            audioUrl: item.file.s3Url,
            category: item.rag.category
        }
    };
    // Insert into vector database
});
```

### For LangChain/LlamaIndex

```python
# Python example for LangChain
from langchain.document_loaders import JSONLoader

# Load metadata
loader = JSONLoader(
    file_path="rag_metadata_[timestamp].json",
    jq_schema=".metadata[]",
    text_content=False
)

documents = loader.load()

# Each document contains:
# - page_content: searchableText
# - metadata: all MP3 info including S3 URL
```

### For Custom RAG Implementation

The metadata structure provides everything needed:
- **Searchable text** for similarity matching
- **Audio file URLs** for retrieval
- **Rich metadata** for context
- **Unique IDs** for tracking

## 🔧 Configuration Options

### Upload Settings
```javascript
// In s3_uploader.js config section
maxConcurrentUploads: 3,    // Parallel uploads (adjust based on bandwidth)
retryAttempts: 3,           // Retry failed uploads
retryDelay: 2000,           // Wait between retries (ms)
```

### File Organization
```javascript
s3Prefix: 'rabbi-gordon-classes/',  // S3 folder for MP3s
metadataPrefix: 'metadata/',        // S3 folder for metadata files
tempDir: './temp_downloads'         // Local temp directory
```

## ❗ Important Notes

1. **Storage Costs**: 425 MP3s ≈ 2-4 GB. Check S3 pricing for your region.

2. **Download Time**: ~2-6 hours depending on file sizes and connection speed.

3. **Bandwidth**: Each MP3 is downloaded then uploaded. Ensure sufficient bandwidth.

4. **Error Handling**: Failed uploads are logged and can be retried separately.

5. **Cleanup**: Temporary files are automatically deleted after upload.

## 🆘 Troubleshooting

### Common Issues

**"Access Denied" Error**
- Check AWS credentials are correct
- Verify IAM user has S3 permissions
- Ensure bucket exists and is in the correct region

**"Network Timeout" Error**
- Reduce `maxConcurrentUploads` to 1-2
- Check internet connection stability
- Some MP3s might be temporarily unavailable

**"Bucket Not Found" Error**
- Verify bucket name is correct
- Check bucket region matches AWS_REGION
- Ensure bucket is created and accessible

### Resume Failed Uploads

The upload log shows which files failed. You can create a script to retry only failed uploads using the log data.

## 🎉 Success!

Once complete, you'll have:
- ✅ **425 MP3s in S3** with proper organization
- ✅ **RAG-optimized metadata** for AI systems
- ✅ **Complete mapping** between files and metadata
- ✅ **Upload logs** for tracking and debugging

Your audio collection is now ready for AI/RAG analysis! 🤖 