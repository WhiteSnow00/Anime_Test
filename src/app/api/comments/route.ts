import { NextRequest, NextResponse } from 'next/server';
import { CommentService } from '@/lib/unified-comment-service';

// GET - Fetch all approved comments
export async function GET() {
  try {
    // Automatically trigger migration on first API call in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const migrationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/auto-migrate`;
        await fetch(migrationUrl);
      } catch (migrationError) {
        console.warn('Auto-migration check failed:', migrationError);
      }
    }

    const comments = await CommentService.getComments();
    const approvedComments = comments.filter(comment => comment.isApproved);
    
    console.log(`📊 Fetched ${approvedComments.length} approved comments from ${CommentService.getDatabaseType()}`);
    
    return NextResponse.json({
      success: true,
      comments: approvedComments,
      count: approvedComments.length,
      database: CommentService.getDatabaseType(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve comments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Add new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, content, episodeViewing } = body;

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    // Add comment using unified service
    const savedComment = await CommentService.addComment({
      userName,
      content,
      userAgent,
      ipAddress,
      episodeViewing
    });

    console.log(`✅ New comment added to ${CommentService.getDatabaseType()}: ${savedComment.id}`);

    return NextResponse.json({
      success: true,
      comment: savedComment,
      database: CommentService.getDatabaseType(),
      message: 'Comment submitted successfully and pending approval'
    });
  } catch (error) {
    console.error('Failed to add comment:', error);
    
    // Check if it's a validation error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isValidationError = errorMessage.includes('không được để trống') || 
                             errorMessage.includes('quá dài') || 
                             errorMessage.includes('spam') ||
                             errorMessage.includes('Missing required fields');
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add comment',
        message: errorMessage,
        isValidation: isValidationError,
        database: CommentService.getDatabaseType()
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
