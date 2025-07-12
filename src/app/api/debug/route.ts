import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET() {
  try {
    // Test environment variables
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const postgresUrlLength = process.env.POSTGRES_URL?.length || 0;
    
    console.log('Debug info:', {
      hasPostgresUrl,
      postgresUrlLength,
      nodeEnv: process.env.NODE_ENV
    });

    // Test database connection
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      const isConnected = await DatabaseService.testConnection();
      dbStatus = isConnected ? 'connected' : 'failed';
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test database initialization
    let initStatus = 'unknown';
    let initError = null;
    
    try {
      await DatabaseService.initDatabase();
      initStatus = 'success';
    } catch (error) {
      initStatus = 'failed';
      initError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      status: 'debug-info',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasPostgresUrl,
        postgresUrlLength,
        platform: 'vercel' // Will help identify deployment platform
      },
      database: {
        connection: dbStatus,
        connectionError: dbError,
        initialization: initStatus,
        initializationError: initError
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
