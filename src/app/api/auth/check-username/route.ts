import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check if username exists
    const exists = await SimpleMongoDBService.checkUsernameExists(username);
    
    return NextResponse.json({
      success: true,
      available: !exists
    });
  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check username availability'
      },
      { status: 500 }
    );
  }
}
