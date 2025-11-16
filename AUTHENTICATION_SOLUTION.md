# 🔐 Chabad.org Authentication Solution Guide

## 🎯 **Issue Identified**

Your scraped MP3 download URLs require **user authentication** (login) to access. Our testing revealed:

- ✅ **Status 200** but **Content-Type: text/html** → Login page instead of MP3
- ❌ **Status 403** with direct requests → Access denied
- 🔐 **All 425 MP3s require Chabad.org user account**

## 💡 **Complete Solution**

I've created a comprehensive authentication system that handles user login and authenticated downloads.

---

## 📋 **Requirements**

### 1. Chabad.org Account
- **Free account** at [chabad.org](https://www.chabad.org)
- **Verify** you can manually download MP3s after logging in
- **Test** with one of your scraped URLs

### 2. AWS S3 Setup
- AWS account with S3 access
- Access Key ID and Secret Access Key
- S3 bucket created

---

## 🚀 **Step-by-Step Process**

### Step 1: Create Chabad.org Account
```bash
1. Go to https://www.chabad.org
2. Click "Sign Up" or "Register"
3. Create free account with email/password
4. Verify email if required
5. Test: Try manually downloading an MP3 from your video URLs
```

### Step 2: Configure Credentials
```bash
# Set environment variables (Windows PowerShell):
$env:AWS_ACCESS_KEY_ID="your_access_key"
$env:AWS_SECRET_ACCESS_KEY="your_secret_key"
$env:AWS_REGION="us-east-1"
$env:S3_BUCKET_NAME="your-bucket-name"

# Optional: Set Chabad.org credentials for automatic login
$env:CHABAD_EMAIL="your_chabad_email@example.com"
$env:CHABAD_PASSWORD="your_chabad_password"
```

### Step 3: Test Authentication
```bash
npm run test-auth
```

This tests if your scraped download URLs work with authentication.

### Step 4: Run Authenticated Upload
```bash
npm run upload-login
```

This will:
1. **Open browser** (visible for manual login)
2. **Navigate to Chabad.org**
3. **Attempt automatic login** (if credentials provided)
4. **Allow manual login** (if automatic fails)
5. **Download all 425 MP3s** with authenticated session
6. **Upload to S3** with metadata
7. **Generate RAG files** for AI analysis

---

## 🔧 **Available Scripts**

| Command | Description |
|---------|-------------|
| `npm run test-auth` | Test authentication with download URLs |
| `npm run upload-login` | Full authenticated upload process |
| `npm run test-download` | Test single download method |
| `node test_aws_setup.js` | Validate AWS credentials |

---

## 📊 **What the Upload Process Does**

### 1. **Authentication**
- Opens browser session with stealth features
- Logs in to Chabad.org (automatic or manual)
- Maintains authenticated session throughout

### 2. **Download Process**
- Uses authenticated browser session
- Downloads each MP3 from protected URLs
- Handles redirects and authentication checks
- Retries failed downloads with exponential backoff

### 3. **S3 Upload**
- Organized file structure: `rabbi-gordon-classes/0001-title.mp3`
- Rich metadata attached to each file
- Progress tracking and error logging

### 4. **RAG Optimization**
- Generates AI-ready metadata structure
- Searchable text for vector databases
- Complete mapping between MP3s and metadata
- Ready for LangChain, LlamaIndex, or custom RAG

---

## 🎛️ **Configuration Options**

### Browser Settings
```javascript
browser: {
    headless: false,     // Keep visible for manual login
    turnstile: true,     // CAPTCHA bypass
    downloadTimeout: 120000,  // 2 minutes per MP3
    pageTimeout: 60000   // 1 minute page load
}
```

### Upload Settings
```javascript
maxConcurrentUploads: 2,  // Sequential due to auth session
retryAttempts: 3,         // Retry failed downloads
retryDelay: 3000         // Wait between retries
```

---

## 📱 **Manual Login Process**

If automatic login fails, the system will guide you through manual login:

```
👤 MANUAL LOGIN REQUIRED
========================

🔐 Please log in to your Chabad.org account manually:
   1. A browser window should be open
   2. Navigate to the login page if not already there
   3. Log in with your Chabad.org account
   4. After logging in, return here and press ENTER

💡 If you don't have an account:
   1. Create a free account at chabad.org
   2. Verify it works by manually downloading an MP3
   3. Then return here and log in

⚠️ IMPORTANT: Keep the browser window open!

Press ENTER after logging in manually: _
```

---

## 📄 **Generated RAG Files**

After successful upload, you'll get:

### 1. `rag_metadata_[timestamp].json`
```json
{
  "id": "chabad-mp3-0001",
  "content": {
    "title": "Rabbi Gordon - Bereishit: 1st Portion",
    "author": "Yehoshua B. Gordon",
    "description": "Audio class by Yehoshua B. Gordon on Bereishit, Parshah"
  },
  "file": {
    "s3Url": "https://bucket.s3.amazonaws.com/path/file.mp3",
    "s3Key": "rabbi-gordon-classes/0001-rabbi-gordon-bereishit-1st-portion.mp3"
  },
  "rag": {
    "contentType": "audio_lecture",
    "category": "jewish_education",
    "searchableText": "rabbi gordon bereishit 1st portion yehoshua b. gordon"
  }
}
```

### 2. `upload_log_[timestamp].json`
- Success/failure tracking
- Error messages for debugging
- File sizes and upload times

### 3. `mp3_s3_mapping_[timestamp].json`
- Simple MP3 → S3 URL mapping
- Quick reference for applications

---

## 🛡️ **Security & Privacy**

### Credentials Protection
- Use environment variables (never hardcode)
- Credentials are only used for authentication
- No credentials stored in output files

### Browser Session
- Uses stealth browser to avoid detection
- Maintains session cookies securely
- Closes browser after completion

### Rate Limiting
- Sequential downloads (not parallel)
- 2-3 second delays between requests
- Respectful of Chabad.org servers

---

## ⚠️ **Important Notes**

1. **Account Required**: You must have a valid Chabad.org account that can access MP3 downloads

2. **Manual Verification**: Test manual download first to ensure your account has access

3. **Time Estimate**: 425 MP3s ≈ 4-8 hours (sequential downloads + uploads)

4. **Browser Window**: Keep the browser window open during the entire process

5. **Session Timeout**: If authentication expires mid-process, you may need to restart

---

## 🆘 **Troubleshooting**

### "Login Required" Errors
- **Solution**: Ensure you're logged in to a valid Chabad.org account
- **Check**: Try manually downloading an MP3 from the website

### "Download Timeout" Errors
- **Solution**: Increase `downloadTimeout` in config
- **Check**: Internet connection stability

### "Access Denied" Errors
- **Solution**: Your account may not have access to these specific MP3s
- **Check**: Try different MP3 URLs or contact Chabad.org

### AWS Upload Errors
- **Solution**: Run `node test_aws_setup.js` to validate credentials
- **Check**: S3 bucket permissions and region settings

---

## 🎯 **Success Metrics**

After completion, you'll have:
- ✅ **425 MP3s in S3** (or maximum accessible)
- ✅ **RAG-optimized metadata** for AI systems
- ✅ **Complete tracking logs** for debugging
- ✅ **Ready-to-use data** for RAG applications

---

## 🚀 **Quick Start Command**

Once you have a Chabad.org account and AWS configured:

```bash
npm run upload-login
```

The system will guide you through the entire process! 🎉

---

## 📞 **Need Help?**

1. **Test authentication first**: `npm run test-auth`
2. **Verify AWS setup**: `node test_aws_setup.js`
3. **Check manual download** from Chabad.org website
4. **Ensure account has MP3 access** for your specific URLs

Your **2000+ Torah classes** will soon be ready for AI analysis! 🤖📚 