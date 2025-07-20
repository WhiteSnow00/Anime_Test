import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';

// GET - Database health check endpoint
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const isConnected = await SimpleMongoDBService.testConnection();
    const connectionTime = Date.now() - startTime;
    
    // Get detailed connection health
    const healthStatus = SimpleMongoDBService.getConnectionHealth();
    
    const response = {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        type: 'MongoDB',
        connected: isConnected,
        connectionTime: `${connectionTime}ms`,
        health: healthStatus,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        databaseName: process.env.MONGODB_DB_NAME || 'anime_streaming',
        maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE || '25',
        serverTimeout: process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '15000',
        // Show first 20 chars of URI for debugging (safe to expose)
        mongoUriPreview: process.env.MONGODB_URI ? 
          process.env.MONGODB_URI.substring(0, 20) + '...' : 'NOT_SET',
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        runtime: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'lambda' : 'local',
        memory: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown',
      }
    };

    const statusCode = isConnected ? 200 : 503;
    
    // Always log health checks in production for debugging
    console.log(`[HEALTH] ${response.status} (${connectionTime}ms) - URI: ${response.environment.mongoUriPreview}`);
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        type: 'MongoDB',
        connected: false,
      },
      environment: {
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        mongoUriPreview: process.env.MONGODB_URI ? 
          process.env.MONGODB_URI.substring(0, 20) + '...' : 'NOT_SET',
      },
      debug: {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorStack: error instanceof Error ? error.stack?.split('\n')[0] : 'No stack',
      }
    };
    
    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// POST - Force connection reset (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, adminPassword } = body;
    
    // Basic admin authentication
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (action === 'reset-connection') {
      await SimpleMongoDBService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SimpleMongoDBService.connect();
      
      return NextResponse.json({
        success: true,
        message: 'Database connection reset successfully',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Connection reset failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
