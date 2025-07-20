#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Helper
 * This script helps you set up environment variables for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Vercel Environment Variables Setup Helper\n');

// Read .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      envVars[key.trim()] = value.trim();
    }
  });
}

console.log('📋 Copy and paste these environment variables into your Vercel project settings:\n');
console.log('Go to: Vercel Dashboard → Your Project → Settings → Environment Variables\n');

// Essential variables for Vercel deployment
const requiredVars = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'NODE_ENV',
  'MONGODB_MAX_POOL_SIZE',
  'MONGODB_SERVER_SELECTION_TIMEOUT',
  'MONGODB_MAX_IDLE_TIME',
  'ADMIN_PASSWORD',
  'MODERATOR_PASSWORD',
  'COMMENT_ENCRYPTION_KEY',
  'ENABLE_DB_LOGGING',
  'LOG_LEVEL',
  'COMMENT_RATE_LIMIT_WINDOW',
  'COMMENT_RATE_LIMIT_MAX',
  'DB_HEALTH_CHECK_INTERVAL',
  'MAX_RECONNECT_ATTEMPTS',
  'RECONNECT_DELAY_BASE'
];

console.log('📝 REQUIRED ENVIRONMENT VARIABLES:\n');
console.log('─'.repeat(60));

requiredVars.forEach(varName => {
  let value = envVars[varName] || '';
  
  // Set production defaults
  if (!value) {
    switch (varName) {
      case 'NODE_ENV':
        value = 'production';
        break;
      case 'MONGODB_DB_NAME':
        value = 'anime_streaming';
        break;
      case 'MONGODB_MAX_POOL_SIZE':
        value = '25';
        break;
      case 'MONGODB_SERVER_SELECTION_TIMEOUT':
        value = '15000';
        break;
      case 'MONGODB_MAX_IDLE_TIME':
        value = '1800000';
        break;
      case 'ENABLE_DB_LOGGING':
        value = 'false';
        break;
      case 'LOG_LEVEL':
        value = 'warn';
        break;
      case 'COMMENT_RATE_LIMIT_WINDOW':
        value = '300000';
        break;
      case 'COMMENT_RATE_LIMIT_MAX':
        value = '10';
        break;
      case 'DB_HEALTH_CHECK_INTERVAL':
        value = '30000';
        break;
      case 'MAX_RECONNECT_ATTEMPTS':
        value = '5';
        break;
      case 'RECONNECT_DELAY_BASE':
        value = '1000';
        break;
      default:
        value = '[SET THIS VALUE]';
    }
  }
  
  // Mask sensitive values for display
  let displayValue = value;
  if (varName.includes('PASSWORD') || varName.includes('URI') || varName.includes('KEY')) {
    if (value && value !== '[SET THIS VALUE]') {
      displayValue = value.substring(0, 8) + '***[MASKED]***';
    }
  }
  
  console.log(`Name: ${varName}`);
  console.log(`Value: ${displayValue}`);
  console.log(`Environment: Production, Preview, Development`);
  console.log('─'.repeat(40));
});

console.log('\n⚠️  SECURITY WARNINGS:');
console.log('1. Change all passwords to secure values before production deployment');
console.log('2. Generate a new encryption key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
console.log('3. Create a new MongoDB user with limited permissions for production');
console.log('4. Never expose credentials in logs or client-side code');

console.log('\n✅ DEPLOYMENT CHECKLIST:');
console.log('□ All environment variables set in Vercel');
console.log('□ MongoDB credentials updated for production');
console.log('□ Admin passwords changed to secure values');
console.log('□ New encryption key generated');
console.log('□ Build tested locally');
console.log('□ Health endpoint will be tested after deployment');

console.log('\n🔗 USEFUL LINKS:');
console.log('• Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables');
console.log('• MongoDB Atlas: https://cloud.mongodb.com/');
console.log('• Project Health Check: https://your-app.vercel.app/api/health');

console.log('\n🚀 Ready for Vercel deployment!');
