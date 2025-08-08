import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { verifyToken } from '@/lib/auth-utils';

/**
 * OPTIMIZED VERSION - Fixes N+1 Query Problem
 * This version uses MongoDB aggregation pipeline to fetch all data in a single query
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Add cache headers for browser caching (5 minutes)
    const headers = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Response-Time': '0'
    };

    // Get episode ID from query params if provided
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode');
    
    // Get user information for like status
    let userId: string | undefined;
    const token = request.cookies.get('auth-token')?.value;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
      } catch (error) {
        // Invalid token, proceed as guest
      }
    }

    // Get IP address for guest like status
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    // OPTIMIZED: Use aggregation pipeline to fetch everything in one go
    const comments = await MongoDBExtendedService.getCommentsWithInteractionsOptimized(
      episodeId ? parseInt(episodeId) : undefined,
      userId,
      ipAddress
    );
    
    const responseTime = Date.now() - startTime;
    headers['X-Response-Time'] = `${responseTime}ms`;
    
    console.log(`[COMMENTS-GET-OPTIMIZED] ✅ Fetched ${comments.length} comments in ${responseTime}ms`);
    
    return NextResponse.json({
      success: true,
      comments: comments,
      count: comments.length,
      database: 'MongoDB',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { headers });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[COMMENTS-GET-OPTIMIZED] ❌ Failed after ${responseTime}ms:`, error);
    
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      responseTime: `${responseTime}ms`
    };
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve comments',
        message: error instanceof Error ? error.message : 'Unknown error',
        debug: errorInfo
      },
      { status: 500 }
    );
  }
}

// Keep the POST method the same as original
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, content, episodeViewing } = body;

    console.log(`[COMMENTS-POST] Data received: user=${userName}, content length=${content?.length}, episode=${episodeViewing}`);

    // Check if user is authenticated
    let userId: string | undefined;
    let displayName: string | undefined;
    const token = request.cookies.get('auth-token')?.value;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
        
        // Get user details to fetch displayName
        const user = await SimpleMongoDBService.getUserById(userId);
        if (user && user.displayName) {
          displayName = user.displayName;
        }
        
        console.log(`[COMMENTS-POST] Authenticated user comment: userId=${userId}, displayName=${displayName}`);
      } catch (error) {
        console.log('[COMMENTS-POST] Invalid token, proceeding as guest comment');
      }
    }

    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    const savedComment = await SimpleMongoDBService.addComment({
      userName,
      displayName,
      content,
      timestamp: new Date(),
      isApproved: true, 
      userAgent,
      ipAddress,
      episodeViewing,
      userId
    });

    console.log(`[COMMENTS-POST] New comment added to MongoDB: ${savedComment._id}`);

    // Clear cache after adding new comment
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    return NextResponse.json({
      success: true,
      comment: savedComment,
      database: 'MongoDB',
      message: 'Comment submitted successfully'
    }, { headers });
    
  } catch (error) {
    console.error('[COMMENTS-POST] Failed to add comment:', error);
    
    let errorMessage = 'Có lỗi xảy ra khi gửi bình luận';
    let isValidation = false;
    let statusCode = 500;
    
    if (error instanceof Error) {
      const errorMsg = error.message;
      console.error(`[COMMENTS-POST] Error details: ${errorMsg}`);
      
      if (errorMsg.includes('không được để trống') || 
          errorMsg.includes('quá dài') || 
          errorMsg.includes('spam') ||
          errorMsg.includes('Missing required fields')) {
        isValidation = true;
        errorMessage = errorMsg;
        statusCode = 400;
      }
      else if (errorMsg.includes('connection') || 
               errorMsg.includes('timeout') || 
               errorMsg.includes('network') ||
               errorMsg.includes('MongoDB') ||
               errorMsg.includes('MONGODB_URI')) {
        errorMessage = 'Đang có sự cố kết nối cơ sở dữ liệu. Vui lòng thử lại sau.';
        statusCode = 503;
        console.error('[COMMENTS-POST] Database connection error detected');
      }
      else if (errorMsg.includes('too many') || 
               errorMsg.includes('rate limit') ||
               errorMsg.includes('overload')) {
        errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.';
        statusCode = 429;
      }
      else if (errorMsg.includes('duplicate') || errorMsg.includes('E11000')) {
        errorMessage = 'Bình luận này đã tồn tại. Vui lòng thử lại.';
        statusCode = 409;
      }
      else {
        errorMessage = `Lỗi hệ thống: ${errorMsg}`;
        console.error(`[COMMENTS-POST] Unhandled error type: ${errorMsg}`);
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add comment',
        message: errorMessage,
        isValidation: isValidation,
        database: 'MongoDB',
        timestamp: new Date().toISOString(),
        canRetry: statusCode === 503 || statusCode === 429,
        debug: {
          hasMongoUri: !!process.env.MONGODB_URI,
          mongoUriLength: process.env.MONGODB_URI?.length || 0,
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      },
      { status: statusCode }
    );
  }
}
