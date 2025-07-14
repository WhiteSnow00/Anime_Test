import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service'; // PostgreSQL service
import { MongoDBService } from '@/lib/mongodb-service'; // MongoDB service

export async function POST(request: Request) {
  try {
    const { action, adminPassword } = await request.json();

    // Verify admin access (simple check for migration safety)
    if (adminPassword !== 'migrate123!') {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid admin password.' },
        { status: 401 }
      );
    }

    if (action === 'migrate') {
      console.log('Starting migration from PostgreSQL to MongoDB...');

      // Step 1: Test both database connections
      const pgConnected = await DatabaseService.testConnection();
      const mongoConnected = await MongoDBService.testConnection();

      if (!pgConnected) {
        throw new Error('PostgreSQL connection failed');
      }

      if (!mongoConnected) {
        throw new Error('MongoDB connection failed');
      }

      // Step 2: Initialize MongoDB database
      await MongoDBService.initDatabase();

      // Step 3: Get all comments from PostgreSQL
      const pgComments = await DatabaseService.getAllComments();
      console.log(`Found ${pgComments.length} comments in PostgreSQL`);

      // Step 4: Migrate comments to MongoDB
      await MongoDBService.migrateFromPostgreSQL(pgComments);

      // Step 5: Verify migration
      const mongoComments = await MongoDBService.getComments();
      console.log(`MongoDB now has ${mongoComments.length} comments`);

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        stats: {
          postgresComments: pgComments.length,
          mongoComments: mongoComments.length,
          timestamp: new Date().toISOString()
        }
      });

    } else if (action === 'test-connections') {
      // Test both database connections
      const pgConnected = await DatabaseService.testConnection();
      const mongoConnected = await MongoDBService.testConnection();

      return NextResponse.json({
        postgresql: {
          connected: pgConnected,
          status: pgConnected ? 'OK' : 'Failed'
        },
        mongodb: {
          connected: mongoConnected,
          status: mongoConnected ? 'OK' : 'Failed'
        }
      });

    } else if (action === 'compare-data') {
      // Compare data between both databases
      const pgComments = await DatabaseService.getAllComments();
      const mongoComments = await MongoDBService.getComments();

      return NextResponse.json({
        comparison: {
          postgresql: {
            count: pgComments.length,
            sample: pgComments.slice(0, 3).map((c: any) => ({
              id: c.id,
              userName: c.userName,
              timestamp: c.timestamp
            }))
          },
          mongodb: {
            count: mongoComments.length,
            sample: mongoComments.slice(0, 3).map((c: any) => ({
              id: c.id,
              userName: c.userName,
              timestamp: c.timestamp
            }))
          }
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: migrate, test-connections, or compare-data' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Migration API',
    endpoints: {
      'POST /api/migrate': 'Migrate data from PostgreSQL to MongoDB',
      actions: [
        'migrate - Copy all data from PostgreSQL to MongoDB',
        'test-connections - Test both database connections',
        'compare-data - Compare data between databases'
      ],
      required: {
        adminPassword: 'migrate123!'
      }
    }
  });
}
