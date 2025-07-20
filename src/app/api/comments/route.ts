import { NextRequest, NextResponse } from 'next/server';
import { CommentService } from '@/lib/server-comment-service';

// GET - Fetch all approved comments
export async function GET() {
  try {
    const comments = await CommentService.getComments();
    
    console.log(`📊 Fetched ${comments.length} approved comments from ${CommentService.getDatabaseType()}`);
    
    return NextResponse.json({
      success: true,
      comments: comments,
      count: comments.length,
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
    
    // Enhanced error handling with Vietnamese messages
    let errorMessage = 'Có lỗi xảy ra khi gửi bình luận';
    let isValidation = false;
    let statusCode = 500;
    
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      // Check for validation errors
      if (errorMsg.includes('không được để trống') || 
          errorMsg.includes('quá dài') || 
          errorMsg.includes('spam') ||
          errorMsg.includes('Missing required fields')) {
        isValidation = true;
        errorMessage = errorMsg;
        statusCode = 400;
      }
      // Check for database connection errors
      else if (errorMsg.includes('connection') || 
               errorMsg.includes('timeout') || 
               errorMsg.includes('network') ||
               errorMsg.includes('MongoDB')) {
        errorMessage = 'Đang có sự cố kết nối cơ sở dữ liệu. Vui lòng thử lại sau.';
        statusCode = 503;
      }
      // Check for rate limiting or overload
      else if (errorMsg.includes('too many') || 
               errorMsg.includes('rate limit') ||
               errorMsg.includes('overload')) {
        errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.';
        statusCode = 429;
      }
      // Check for duplicate errors
      else if (errorMsg.includes('duplicate') || errorMsg.includes('E11000')) {
        errorMessage = 'Bình luận này đã tồn tại. Vui lòng thử lại.';
        statusCode = 409;
      }
      else {
        errorMessage = `Lỗi hệ thống: ${errorMsg}`;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add comment',
        message: errorMessage,
        isValidation: isValidation,
        database: CommentService.getDatabaseType(),
        timestamp: new Date().toISOString(),
        // Include retry suggestion for connection errors
        canRetry: statusCode === 503 || statusCode === 429
      },
      { status: statusCode }
    );
  }
}
