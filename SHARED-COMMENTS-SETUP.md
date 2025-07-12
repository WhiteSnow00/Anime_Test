# 🗄️ Shared Database Setup for Both Sites

## ✅ **Solution: External Postgres Database**

This will allow both `anime-kana.vercel.app` and `ayaya-kana.id.vn` to share the same comment database.

**Note:** Vercel doesn't provide Postgres in their marketplace. We'll use an external provider.

## 🚀 **Step 1: Choose a Database Provider**

## ✅ **SETUP COMPLETED SUCCESSFULLY!**

Your Neon PostgreSQL database is now connected and working! 

**Database Details:**
- Provider: Neon PostgreSQL
- Host: `ep-round-pine-a7ky8dkr-pooler.ap-southeast-2.aws.neon.tech`
- Database: `neondb`
- Status: ✅ Connected and table created
- Comments table: ✅ Ready for use

**Environment Variables Set:**
- `POSTGRES_URL`: ✅ Configured
- `ADMIN_PASSWORD`: ✅ Set to 826264
- `COMMENT_ENCRYPTION_KEY`: ✅ Configured

---

### **Option A: Neon (Recommended) ✅ COMPLETED**
1. Go to [Neon Console](https://console.neon.tech)
2. Create account and new project
3. Free tier: 512MB storage, 1 database
4. Copy the connection string

### **Option B: Supabase**
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Free tier: 500MB database, 50MB file storage
4. Go to Settings → Database → Connection string

### **Option C: Railway**
1. Go to [Railway](https://railway.app)
2. New Project → Add PostgreSQL
3. Free tier: $5 credit monthly
4. Copy DATABASE_URL from variables

## � **NEXT STEPS**

### **1. Test Your Local Setup ✅ COMPLETED**
- Development server: http://localhost:9002
- Health check: http://localhost:9002/api/health
- Comments API: http://localhost:9002/api/comments
- Admin panel: http://localhost:9002/comment (password: 826264)

### **2. Deploy to Vercel (anime-kana.vercel.app)**
1. **Add Environment Variables in Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your project → Settings → Environment Variables
   - Add these exact variables:
   ```
   POSTGRES_URL=postgresql://neondb_owner:npg_2SnPZ9dWplyY@ep-round-pine-a7ky8dkr-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
   ADMIN_PASSWORD=826264
   COMMENT_ENCRYPTION_KEY=anime-comment-secure-key-123456!!
   ```

2. **Deploy your code:**
   ```bash
   git add .
   git commit -m "Add shared Neon database for comments"
   git push origin main
   ```
   
3. **Test after deployment:**
   - Visit: `https://anime-kana.vercel.app/api/health`
   - Should show: `{"status":"healthy","database":"connected"}`

### **3. Deploy to Your Server (ayaya-kana.id.vn)**
1. **SSH into your server and add the same environment variables:**
   ```bash
   # Navigate to your project directory
   cd /path/to/your/anime/project
   
   # Add the exact same environment variables
   echo 'POSTGRES_URL="postgresql://neondb_owner:npg_2SnPZ9dWplyY@ep-round-pine-a7ky8dkr-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require"' >> .env.local
   echo 'ADMIN_PASSWORD="826264"' >> .env.local
   echo 'COMMENT_ENCRYPTION_KEY="anime-comment-secure-key-123456!!"' >> .env.local
   ```

2. **Pull the latest code and restart:**
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart your-app  # or however you restart your server
   ```

3. **Test your server:**
   - Visit: `https://ayaya-kana.id.vn/api/health`
   - Should show: `{"status":"healthy","database":"connected"}`

## ✅ **Step 2: Environment Variables Setup**

### **For Vercel Deployment (anime-kana.vercel.app):**

1. Project Settings → Environment Variables
2. Add these variables:
   ```
   POSTGRES_URL=postgresql://username:password@host:5432/database
   ADMIN_PASSWORD=your-secure-admin-password
   COMMENT_ENCRYPTION_KEY=your-32-character-encryption-key
   ```

### **For Your Server (ayaya-kana.id.vn):**

1. SSH into your server
2. Add the SAME environment variables to `.env.local`:
   ```bash
   echo "POSTGRES_URL=postgresql://username:password@host:5432/database" >> .env.local
   echo "ADMIN_PASSWORD=your-secure-admin-password" >> .env.local
   echo "COMMENT_ENCRYPTION_KEY=your-32-character-encryption-key" >> .env.local
   ```

**⚠️ Important:** Both sites must use the exact same database URL to share comments!

## 📋 **Step 3: Deploy Updated Code**

1. **Test database connection locally:**
   ```bash
   npm run build
   npm run start
   ```
   Check console for "Database initialized successfully"

2. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Add shared database for comments"
   git push origin main
   ```

3. **Deploy to both platforms:**
   - **Vercel:** Auto-deploy from GitHub (check deployment logs)
   - **Your server:** Pull latest code and restart

## 🔄 **Step 4: Migration (Optional)**

If you have existing comments in file storage, they can be migrated:

1. Access the admin panel: `https://your-site.com/comment`
2. Use the admin password you set
3. Manually re-approve important comments
4. Old comments in `data/comments.json` are automatically ignored

## ✅ **Step 5: Testing Shared Comments**

1. **Test on both sites:**
   - Post a comment on `anime-kana.vercel.app`
   - Check if it appears on `ayaya-kana.id.vn`
   - Approve/moderate from either admin panel

2. **Verify admin access:**
   - Visit `/comment` on both sites
   - Use the same admin password
   - Changes should sync across sites

## 🔧 **Alternative: Upstash Redis (Simpler Setup)**

If PostgreSQL seems complex, you can use Redis instead:

1. Go to [Upstash](https://upstash.com) → Create Redis database
2. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Update the database service to use Redis
4. Free tier: 10K commands daily

## 🚨 **Troubleshooting**

- **Connection failed:** Double-check `POSTGRES_URL` format
- **Table not found:** Check deployment logs for initialization errors
- **Comments not syncing:** Ensure both sites use identical database URL
- **Admin login failed:** Verify `ADMIN_PASSWORD` is set correctly

If you have existing comments in files, I can create a migration script to move them to the database.

## ✅ **Result: Shared Comments**

After setup:
- ✅ Comments posted on `anime-kana.vercel.app` appear on `ayaya-kana.id.vn`
- ✅ Comments posted on `ayaya-kana.id.vn` appear on `anime-kana.vercel.app`
- ✅ Admin panel works on both sites with password `826264`
- ✅ Centralized comment management

## 🆎 **Alternative: Simple API Approach**

If database setup is too complex, I can create a simpler solution:

1. Use Vercel site as the "master" comment API
2. Your server calls Vercel API for comments
3. Requires API key setup but simpler than database

Would you like me to:
1. Help set up the Vercel database?
2. Create a migration script for existing comments?
3. Set up the simpler API approach instead?

## 🛠️ **Testing**

Once deployed, test:
1. Add comment on site A
2. Check if it appears on site B
3. Approve comment in admin panel
4. Verify it shows as approved on both sites
