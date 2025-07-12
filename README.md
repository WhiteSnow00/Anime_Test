# 🎌 Advanced Anime Streaming Web App

A feature-rich anime streaming platform built with Next.js, featuring a global comment system with admin management.

## ✨ Features

- 🎬 **Modern Streaming Interface** - Clean, responsive design with episode selection
- 💬 **Global Comment System** - Shared comments across multiple deployments
- 🔐 **Admin Management** - Secure admin panel for comment moderation
- 🌐 **Multi-Site Sync** - Comments sync between different domains
- 🔒 **Encrypted Storage** - Secure database storage with encryption
- 📱 **Mobile Responsive** - Works perfectly on all devices

## 🚀 Quick Setup

1. **Clone and install:**
   ```bash
   git clone <repository>
   cd Web
   npm install
   ```

2. **Setup database:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   npm run setup-db
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

See [SHARED-COMMENTS-SETUP.md](./SHARED-COMMENTS-SETUP.md) for detailed instructions on setting up shared comments between multiple sites.

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - How to deploy to various platforms
- **[Shared Comments Setup](./SHARED-COMMENTS-SETUP.md)** - Multi-site comment configuration
- **[API Documentation](./src/app/api/)** - API endpoints for comments and admin

## 🛠️ Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run setup-db     # Initialize database
```

## 🔧 Environment Variables

Required environment variables:

```env
POSTGRES_URL=postgresql://...     # Database connection
ADMIN_PASSWORD=secure-password    # Admin panel password
COMMENT_ENCRYPTION_KEY=32-chars   # Encryption key for sensitive data
```

## 📱 Admin Panel

Access the admin panel at `/comment` with your admin password to:
- Moderate comments
- View user analytics
- Manage episode discussions
- Delete inappropriate content

## 🏗️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Database:** PostgreSQL (via @vercel/postgres)
- **Deployment:** Vercel, Custom servers
- **Security:** Environment-based secrets, encrypted storage