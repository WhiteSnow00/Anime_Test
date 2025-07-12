#!/usr/bin/env node

/**
 * Database Setup Script
 * Run this script to initialize the database and test connection
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Setting up shared comment database...\n');

// Check if .env.local exists
const fs = require('fs');
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('Please create .env.local with the following variables:');
  console.log('');
  console.log('POSTGRES_URL=postgresql://username:password@host:5432/database');
  console.log('ADMIN_PASSWORD=your-secure-admin-password');
  console.log('COMMENT_ENCRYPTION_KEY=your-32-character-encryption-key');
  console.log('');
  console.log('See SHARED-COMMENTS-SETUP.md for detailed instructions.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
const requiredVars = ['POSTGRES_URL', 'ADMIN_PASSWORD', 'COMMENT_ENCRYPTION_KEY'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.log('❌ Missing required environment variables:');
  missing.forEach(varName => console.log(`  - ${varName}`));
  console.log('\nPlease add them to .env.local');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log('🔧 Testing database connection...\n');

// Build the project first
console.log('📦 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.log('❌ Build failed');
    process.exit(1);
  }
  
  console.log('✅ Build successful');
  console.log('🌐 Testing health endpoint...');
  
  // Start the server temporarily to test database
  const serverProcess = spawn('npm', ['run', 'start'], { stdio: 'pipe' });
  
  // Wait a moment for server to start
  setTimeout(async () => {
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:4000/api/health');
      const data = await response.json();
      
      if (data.status === 'healthy') {
        console.log('✅ Database connection successful!');
        console.log('✅ Setup complete!');
        console.log('\nNext steps:');
        console.log('1. Deploy to your platforms');
        console.log('2. Set the same environment variables on both sites');
        console.log('3. Test comments on both sites');
      } else {
        console.log('❌ Database connection failed:', data.message);
      }
    } catch (error) {
      console.log('❌ Failed to test connection:', error.message);
    }
    
    // Kill the server
    serverProcess.kill();
    process.exit(0);
  }, 3000);
});
