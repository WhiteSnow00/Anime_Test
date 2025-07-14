import { NextResponse } from 'next/server';
import { CommentService } from '@/lib/unified-comment-service';

export async function GET() {
  try {
    const comments = await CommentService.getComments();
    const dbType = CommentService.getDatabaseType();
    
    return NextResponse.json({
      success: true,
      database: dbType,
      totalComments: comments.length,
      approvedComments: comments.filter(c => c.isApproved).length,
      pendingComments: comments.filter(c => !c.isApproved).length,
      sampleComments: comments.slice(0, 3).map(c => ({
        id: c.id,
        userName: c.userName,
        content: c.content.substring(0, 50) + '...',
        isApproved: c.isApproved,
        timestamp: c.timestamp
      })),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Database test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        database: CommentService.getDatabaseType()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userName, content } = await request.json();
    
    if (!userName || !content) {
      return NextResponse.json(
        { error: 'userName and content are required for test' },
        { status: 400 }
      );
    }

    // Add a test comment
    const testComment = await CommentService.addComment({
      userName: `TEST_${userName}`,
      content: `TEST: ${content}`,
      userAgent: 'Test Agent',
      ipAddress: 'localhost',
      episodeViewing: 1
    });

    return NextResponse.json({
      success: true,
      message: 'Test comment added successfully',
      comment: testComment,
      database: CommentService.getDatabaseType(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to add test comment',
        message: error instanceof Error ? error.message : 'Unknown error',
        database: CommentService.getDatabaseType()
      },
      { status: 500 }
    );
  }
}
