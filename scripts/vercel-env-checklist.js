const fs = require('fs');
const path = require('path');

// Read .env.local and show what needs to be added to Vercel
function generateVercelEnvChecklist() {
  console.log('🔧 VERCEL ENVIRONMENT VARIABLES CHECKLIST\n');
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found!');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  console.log('📋 Add these environment variables to Vercel:');
  console.log('   Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables\n');
  
  const criticalVars = [
    'MONGODB_URI',
    'MONGODB_DB_NAME', 
    'ADMIN_PASSWORD',
    'COMMENT_ENCRYPTION_KEY'
  ];

  let foundCritical = [];
  let allVars = [];

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      allVars.push({ key, value, isCritical: criticalVars.includes(key) });
      if (criticalVars.includes(key)) {
        foundCritical.push(key);
      }
    }
  });

  // Show critical variables first
  console.log('🚨 CRITICAL (Required for basic functionality):');
  allVars.filter(v => v.isCritical).forEach(({key, value}) => {
    const safeValue = key.includes('URI') || key.includes('PASSWORD') || key.includes('KEY') 
      ? '***HIDDEN***' 
      : value;
    console.log(`   ✅ ${key} = ${safeValue}`);
  });

  console.log('\n⚙️  OPTIONAL (For optimization):');
  allVars.filter(v => !v.isCritical).forEach(({key, value}) => {
    console.log(`   📝 ${key} = ${value}`);
  });

  // Check if any critical vars are missing
  const missingCritical = criticalVars.filter(v => !foundCritical.includes(v));
  if (missingCritical.length > 0) {
    console.log(`\n❌ MISSING CRITICAL VARIABLES:`);
    missingCritical.forEach(key => {
      console.log(`   - ${key}`);
    });
  }

  console.log('\n🔄 After adding environment variables:');
  console.log('   1. Redeploy your project (or it will auto-deploy)');
  console.log('   2. Test: https://anime-kana.vercel.app/api/health');
  console.log('   3. Test: https://anime-kana.vercel.app/api/comments');
  
  console.log('\n⚡ Quick test command:');
  console.log('   node scripts/debug-production.js https://anime-kana.vercel.app');
}

generateVercelEnvChecklist();
