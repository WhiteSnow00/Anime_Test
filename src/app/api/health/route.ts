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
        databaseName: process.env.MONGODB_DB_NAME || 'anime_streaming',
        maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE || '25',
        serverTimeout: process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '15000',
      }
    };

    const statusCode = isConnected ? 200 : 503;
    
    if (process.env.ENABLE_DB_LOGGING === 'true') {
      console.log(`Health check completed: ${response.status} (${connectionTime}ms)`);
    }
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        type: 'MongoDB',
        connected: false,
      }
    }, { status: 503 });
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
