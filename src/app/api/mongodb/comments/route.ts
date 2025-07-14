import { NextResponse } from 'next/server';
import { MongoDBService } from '@/lib/mongodb-service';

export async function GET() {
  try {
    // Test MongoDB connection first
    const isConnected = await MongoDBService.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Get all comments from MongoDB
    const comments = await MongoDBService.getComments();
    
    return NextResponse.json({
      success: true,
      comments,
      count: comments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve comments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userName, content, episodeViewing } = await request.json();

    // Validation
    if (!userName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userName, content' },
        { status: 400 }
      );
    }

    if (userName.length > 100) {
      return NextResponse.json(
        { error: 'Username too long (max 100 characters)' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Content too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Create comment object
    const commentData = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userName: userName.trim(),
      content: content.trim(),
      timestamp: new Date(),
      isApproved: false, // Requires admin approval
      userAgent,
      ipAddress,
      episodeViewing: episodeViewing ? parseInt(episodeViewing) : undefined
    };

    // Add comment to MongoDB
    const savedComment = await MongoDBService.addComment(commentData);

    return NextResponse.json({
      success: true,
      comment: savedComment,
      message: 'Comment submitted successfully and pending approval'
    });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add comment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
