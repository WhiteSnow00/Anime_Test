import { NextResponse } from 'next/server';

// Simple debug endpoint to check environment variables (be careful with this in production!)
export async function GET() {
  // Only allow in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_ENDPOINT !== 'true') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    
    // Environment variable checks (safe info only)
    mongoUri: {
      exists: !!process.env.MONGODB_URI,
      length: process.env.MONGODB_URI?.length || 0,
      preview: process.env.MONGODB_URI ? 
        process.env.MONGODB_URI.substring(0, 30) + '...' : 'NOT_SET',
      startsWithMongodb: process.env.MONGODB_URI?.startsWith('mongodb') || false,
      containsPassword: process.env.MONGODB_URI?.includes('@') || false,
    },
    
    dbName: process.env.MONGODB_DB_NAME || 'NOT_SET',
    
    poolConfig: {
      maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE || 'NOT_SET',
      serverTimeout: process.env.MONGODB_SERVER_SELECTION_TIMEOUT || 'NOT_SET',
      maxIdleTime: process.env.MONGODB_MAX_IDLE_TIME || 'NOT_SET',
    },
    
    adminConfig: {
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      adminPasswordLength: process.env.ADMIN_PASSWORD?.length || 0,
      hasEncryptionKey: !!process.env.COMMENT_ENCRYPTION_KEY,
      encryptionKeyLength: process.env.COMMENT_ENCRYPTION_KEY?.length || 0,
    },
    
    logging: {
      enableDbLogging: process.env.ENABLE_DB_LOGGING || 'NOT_SET',
      logLevel: process.env.LOG_LEVEL || 'NOT_SET',
    },
    
    // All environment variables (names only, for debugging)
    allEnvVars: Object.keys(process.env).filter(key => 
      key.startsWith('MONGODB_') || 
      key.includes('ADMIN') || 
      key.includes('COMMENT') ||
      key === 'NODE_ENV' ||
      key.includes('LOG')
    ).sort((a, b) => a.localeCompare(b)),
  };

  console.log('[DEBUG] Environment check requested:', {
    hasMongoUri: envCheck.mongoUri.exists,
    mongoUriLength: envCheck.mongoUri.length,
    dbName: envCheck.dbName,
    environment: envCheck.environment,
  });

  return NextResponse.json(envCheck);
}
