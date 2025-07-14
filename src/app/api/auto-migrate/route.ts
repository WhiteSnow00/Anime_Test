import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service'; // PostgreSQL
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service'; // MongoDB

let migrationCompleted = false;

export async function GET() {
  try {
    if (migrationCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Migration already completed',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🚀 Starting automatic database migration...');

    // Step 1: Test both database connections
    console.log('📡 Testing database connections...');
    const pgConnected = await DatabaseService.testConnection();
    const mongoConnected = await SimpleMongoDBService.testConnection();

    if (!pgConnected) {
      console.warn('⚠️ PostgreSQL connection failed - continuing with MongoDB setup only');
    }

    if (!mongoConnected) {
      throw new Error('❌ MongoDB connection failed - cannot proceed');
    }

    console.log('✅ MongoDB connection successful');

    // Step 2: Initialize MongoDB database
    console.log('🔧 Initializing MongoDB database...');
    await SimpleMongoDBService.initDatabase();
    console.log('✅ MongoDB database initialized');

    // Step 3: Check if we already have data in MongoDB
    const existingMongoComments = await SimpleMongoDBService.getComments();
    console.log(`📊 Found ${existingMongoComments.length} existing comments in MongoDB`);

    let migrationStats = {
      postgresComments: 0,
      mongoComments: existingMongoComments.length,
      migratedComments: 0,
      duplicatesSkipped: 0
    };

    // Step 4: Migrate from PostgreSQL if connected and has data
    if (pgConnected) {
      try {
        console.log('📥 Fetching comments from PostgreSQL...');
        const pgComments = await DatabaseService.getAllComments();
        console.log(`📊 Found ${pgComments.length} comments in PostgreSQL`);
        
        migrationStats.postgresComments = pgComments.length;

        if (pgComments.length > 0) {
          console.log('🔄 Starting comment migration...');
          
          for (const pgComment of pgComments) {
            // Check if comment already exists in MongoDB
            const existingComment = existingMongoComments.find((mc: any) => mc.id === pgComment.id);
            
            if (!existingComment) {
              // Migrate this comment
              const mongoComment = {
                id: pgComment.id,
                userName: pgComment.userName,
                content: pgComment.content,
                timestamp: new Date(pgComment.timestamp),
                isApproved: pgComment.isApproved,
                userAgent: pgComment.userAgent || '',
                ipAddress: pgComment.ipAddress || '',
                episodeViewing: pgComment.episodeViewing
              };

              await SimpleMongoDBService.addComment(mongoComment);
              migrationStats.migratedComments++;
              console.log(`✅ Migrated comment: ${pgComment.id}`);
            } else {
              migrationStats.duplicatesSkipped++;
              console.log(`⏭️ Skipped duplicate comment: ${pgComment.id}`);
            }
          }
        }
      } catch (pgError) {
        console.warn('⚠️ PostgreSQL migration failed, but MongoDB is ready:', pgError);
      }
    }

    // Step 5: Final verification
    const finalMongoComments = await SimpleMongoDBService.getComments();
    migrationStats.mongoComments = finalMongoComments.length;

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Migration stats:', migrationStats);

    migrationCompleted = true;

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      stats: migrationStats,
      timestamp: new Date().toISOString(),
      notes: [
        'MongoDB is now the primary database for development',
        'New comments will be saved to MongoDB',
        'Production deployment continues to use PostgreSQL',
        'Run this endpoint again to see current status'
      ]
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
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

// Allow POST for manual trigger
export async function POST() {
  migrationCompleted = false; // Reset flag to allow re-migration
  return GET();
}
