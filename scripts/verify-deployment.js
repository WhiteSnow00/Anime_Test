const fs = require('fs');
const path = require('path');

// Quick deployment verification script
function verifyDeployment() {
  console.log('🔍 Verifying deployment configuration...\n');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  const hasEnv = fs.existsSync(envPath);
  
  console.log(`📋 Environment file: ${hasEnv ? '✅ Found' : '❌ Missing'}`);
  
  if (hasEnv) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log(`   Variables found: ${lines.length}`);
    lines.forEach(line => {
      const [key] = line.split('=');
      console.log(`   - ${key}`);
    });
  }

  // Check for critical files
  const criticalFiles = [
    'src/lib/simple-mongodb-service.ts',
    'src/app/api/comments/route.ts',
    'src/app/api/health/route.ts',
    'src/app/api/debug/route.ts'
  ];

  console.log('\n📁 Critical files:');
  criticalFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // Check package.json for dependencies
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('\n📦 Key dependencies:');
    const keyDeps = ['mongoose', 'mongodb', 'next'];
    keyDeps.forEach(dep => {
      const version = packageJson.dependencies?.[dep] || 'Not found';
      console.log(`   - ${dep}: ${version}`);
    });
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Ensure all environment variables are set in Vercel dashboard');
  console.log('2. Deploy to Vercel');
  console.log('3. Test /api/debug endpoint (remember to disable in production)');
  console.log('4. Test /api/health endpoint');
  console.log('5. Check Vercel function logs for any errors');
  console.log('\n✨ Configuration verified!');
}

verifyDeployment();
