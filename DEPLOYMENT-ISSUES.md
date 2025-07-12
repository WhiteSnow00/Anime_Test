# 🚀 Deployment Solutions

## ⚠️ IMPORTANT: Current Issues

### Issue 1: Separate Comment Storage
- **Vercel**: `https://anime-kana.vercel.app/` has its own comment storage
- **Your Server**: `http://ayaya-kana.id.vn/` has its own comment storage
- **They DO NOT share comments!** Each deployment is independent.

### Issue 2: Missing Environment Variables
Your deployments likely don't have `ADMIN_PASSWORD` set, causing login failures.

## 🔧 Solutions

### Option A: Fix Environment Variables (Easiest)

#### For Vercel (anime-kana.vercel.app):
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project `anime-kana`
3. Go to Settings → Environment Variables
4. Add:
   - `ADMIN_PASSWORD` = `826264`
   - `COMMENT_ENCRYPTION_KEY` = `anime-comment-secure-key-123456!!`
5. Redeploy

#### For Your Server (ayaya-kana.id.vn):
1. SSH into your server
2. Set environment variables:
   ```bash
   export ADMIN_PASSWORD=826264
   export COMMENT_ENCRYPTION_KEY=anime-comment-secure-key-123456!!
   ```
3. Or add to your deployment config

### Option B: Shared Comment Storage (Advanced)

If you want both sites to share comments, you need:

1. **Database Solution**: Use PostgreSQL, MongoDB, or MySQL instead of file storage
2. **Shared File Storage**: Use cloud storage like AWS S3, Google Cloud Storage
3. **API Gateway**: One centralized comment API that both sites call

### Option C: Choose One Primary Site

Pick either Vercel OR your server as the main site, redirect the other.

## 🛠️ Quick Fix for Testing

Test locally first:
```bash
# Set environment variable temporarily
$env:ADMIN_PASSWORD="826264"
npm run dev
```

## 📋 Deployment Checklist

Before deploying:
- [ ] Set `ADMIN_PASSWORD` environment variable
- [ ] Set `COMMENT_ENCRYPTION_KEY` environment variable  
- [ ] Test admin login works
- [ ] Decide if you want shared or separate comment storage
- [ ] Consider using a database for production

## 🔍 Debug Steps

1. Check environment variables are set on deployment platform
2. Check server logs for "ADMIN_PASSWORD environment variable is not set"
3. Test admin login with correct password
4. Verify comment storage location

Would you like me to help implement any of these solutions?
