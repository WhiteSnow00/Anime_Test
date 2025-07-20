# 🚀 Vercel Deployment Guide for NextJS Anime Project

## 🔧 Environment Variables Setup

### Required Environment Variables for Vercel:

1. **Go to your Vercel Project Dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add the following variables:**

#### Essential Configuration:
```
Name: MONGODB_URI
Value: mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/

Name: MONGODB_DB_NAME  
Value: anime_streaming

Name: NODE_ENV
Value: production
```

#### Performance Configuration:
```
Name: MONGODB_MAX_POOL_SIZE
Value: 25

Name: MONGODB_SERVER_SELECTION_TIMEOUT
Value: 15000

Name: MONGODB_MAX_IDLE_TIME
Value: 1800000
```

#### Admin & Security:
```
Name: ADMIN_PASSWORD
Value: admin123!

Name: MODERATOR_PASSWORD
Value: mod123!

Name: COMMENT_ENCRYPTION_KEY
Value: your-32-character-encryption-key-here-2024
```

#### Logging Configuration:
```
Name: ENABLE_DB_LOGGING
Value: false

Name: LOG_LEVEL
Value: warn
```

#### Rate Limiting:
```
Name: COMMENT_RATE_LIMIT_WINDOW
Value: 300000

Name: COMMENT_RATE_LIMIT_MAX
Value: 10
```

#### Connection Health:
```
Name: DB_HEALTH_CHECK_INTERVAL
Value: 30000

Name: MAX_RECONNECT_ATTEMPTS
Value: 5

Name: RECONNECT_DELAY_BASE
Value: 1000
```

## 🔒 Security Recommendations for Production

### 1. **Update MongoDB Credentials**
⚠️ **IMPORTANT**: The current credentials are exposed in the repository history. For production:

1. **Create a new MongoDB Atlas user** with limited permissions:
   - Only `readWrite` access to the `anime_streaming` database
   - No admin privileges
   - Strong password (16+ characters, mixed case, numbers, symbols)

2. **Update the connection string** with the new credentials:
   ```
   mongodb+srv://new_user:secure_password@ayaya.jtefs5i.mongodb.net/
   ```

### 2. **Admin Password Security**
- Change `ADMIN_PASSWORD` and `MODERATOR_PASSWORD` to strong, unique values
- Use a password manager to generate secure passwords
- Minimum 12 characters with mixed case, numbers, and symbols

### 3. **Encryption Key**
Generate a new encryption key using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Vercel Deployment Steps

### 1. **Environment Variables Setup**
- Add all required environment variables in Vercel dashboard
- Set environment scope to "Production, Preview, and Development" or as needed

### 2. **Deploy Settings**
- **Framework Preset**: Next.js
- **Node.js Version**: 18.x or later
- **Build Command**: `npm run build` (default)
- **Install Command**: `npm install` (default)

### 3. **Build Configuration**
Ensure your `next.config.ts` includes:
```typescript
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Keep this for faster builds
  },
  eslint: {
    ignoreDuringBuilds: true, // Keep this for faster builds
  },
  // Add environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};
```

### 4. **Deployment Process**
1. Push your code to GitHub
2. Trigger deployment through Vercel dashboard or Git push
3. Monitor build logs for any issues
4. Test the deployed application

## 🏥 Health Check After Deployment

### 1. **Test Health Endpoint**
Visit: `https://your-app.vercel.app/api/health`

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "type": "MongoDB",
    "connected": true,
    "connectionTime": "XXXms"
  }
}
```

### 2. **Test Comment Functionality**
1. Visit your deployed site
2. Try submitting a comment
3. Check if comments are properly saved and displayed
4. Test error handling by submitting invalid data

### 3. **Monitor Logs**
- Check Vercel Function logs for any errors
- Monitor MongoDB Atlas logs for connection patterns
- Watch for any performance issues

## 🔍 Troubleshooting Common Issues

### Build Errors:
- **Environment Variable Missing**: Ensure all required variables are set in Vercel
- **MongoDB Connection**: Verify connection string format and credentials
- **TypeScript Errors**: Check if `ignoreBuildErrors: true` is set

### Runtime Errors:
- **Connection Timeouts**: MongoDB Atlas free tier may have delays
- **Rate Limiting**: Monitor connection pool usage
- **Memory Issues**: Vercel has memory limits for free tier

### Performance Issues:
- **Cold Starts**: First request after inactivity may be slow
- **Database Latency**: Atlas free tier has shared resources
- **Connection Pool**: Monitor pool exhaustion

## 📊 Production Monitoring

### 1. **Vercel Analytics**
- Enable Vercel Analytics for performance monitoring
- Monitor function execution times
- Track error rates

### 2. **MongoDB Atlas Monitoring**
- Monitor connection usage (stay under 500 for free tier)
- Track database performance metrics
- Set up alerts for unusual activity

### 3. **Health Checks**
- Set up uptime monitoring (e.g., UptimeRobot)
- Monitor `/api/health` endpoint
- Alert on connection failures

## 🎯 Expected Performance

### Vercel Free Tier:
- **Build Time**: 2-4 minutes
- **Cold Start**: 1-3 seconds
- **Warm Response**: 100-500ms
- **Function Timeout**: 10 seconds (hobby plan)

### MongoDB Atlas M0:
- **Connection Time**: 200-1000ms
- **Query Response**: 50-300ms
- **Daily Limits**: Monitor storage (512MB) and operations

## 🚨 Emergency Procedures

### If Deployment Fails:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `npm run build`
4. Check MongoDB connection independently

### If Comments Stop Working:
1. Check `/api/health` endpoint
2. Verify MongoDB Atlas cluster is running
3. Check connection pool status
4. Review Vercel function logs

### Connection Reset:
Use the admin endpoint to reset connections:
```bash
curl -X POST https://your-app.vercel.app/api/health \
  -H "Content-Type: application/json" \
  -d '{"action": "reset-connection", "adminPassword": "your-admin-password"}'
```

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] MongoDB credentials updated with secure values
- [ ] Admin passwords changed to strong values
- [ ] Encryption key generated and set
- [ ] Build tested locally
- [ ] Health endpoint tested
- [ ] Comment functionality tested
- [ ] Error handling verified
- [ ] MongoDB Atlas cluster is active
- [ ] Connection limits understood (500 for free tier)

**Ready for deployment!** 🚀
