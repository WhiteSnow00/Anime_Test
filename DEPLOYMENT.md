# Deployment Guide

## Environment Variables Required

When deploying this application, you need to set these environment variables on your hosting platform:

### Required Variables:
- `COMMENT_ENCRYPTION_KEY` = `your-32-char-encryption-key-here`
- `ADMIN_PASSWORD` = `your-secure-admin-password`
- `NEXT_PUBLIC_APP_NAME` = `"Hoa Thơm Kiêu Hãnh"`

## Platform-Specific Instructions:

### Vercel:
1. Deploy: `vercel --prod`
2. Dashboard → Project → Settings → Environment Variables
3. Add the variables above

### Netlify:
1. Connect GitHub repo
2. Site Settings → Environment Variables
3. Add the variables above

### Railway:
1. Connect GitHub repo
2. Variables tab in project
3. Add the variables above

## Admin Access:
- URL: `your-domain.com/comment`
- Password: Set in environment variable `ADMIN_PASSWORD`

## Security Notes:
- Never commit `.env.local` to git
- Use strong passwords for production
- Use strong encryption key for production
- Change default passwords before deployment
