import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { verifyToken } from '@/lib/auth-utils';
import CacheService from '@/lib/cache-service';

export async function GET(request: NextRequest) {
  try {
    // Get episode ID from query params if provided
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode');
    
    // Check cache first
    const cacheKey = CacheService.getCacheKey('comments', episodeId || 'all');
    let comments: any[] = CacheService.get(cacheKey) || [];
    
    if (comments.length === 0) {
      // Get comments with interactions (likes and replies) from database
      comments = await MongoDBExtendedService.getCommentsWithInteractions(
        episodeId ? parseInt(episodeId) : undefined
      );
      
      // Cache for 2 minutes
      CacheService.set(cacheKey, comments, 2);
    }
    
    // Get user information to determine like status
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

    // Batch get user like status for all comments and replies
    const allCommentIds: string[] = [];
    const allReplyIds: string[] = [];
    
    comments.forEach((comment: any) => {
      if (comment._id) allCommentIds.push(comment._id);
      comment.replies?.forEach((reply: any) => {
        if (reply._id) allReplyIds.push(reply._id);
      });
    });
    
    const allIds = [...allCommentIds, ...allReplyIds];
    
    // Get all user likes in batch for only the relevant comment/reply IDs
    const userLikedComments = await MongoDBExtendedService.getUserLikeHistory(userId, ipAddress, allIds);
    const userLikedSet = new Set(userLikedComments);

    // Add user's like status to each comment and reply
    const commentsWithUserStatus = comments.map((comment: any) => {
      const repliesWithStatus = comment.replies?.map((reply: any) => ({
        ...reply,
        userLiked: userLikedSet.has(reply._id!)
      })) || [];

      return {
        ...comment,
        userLiked: userLikedSet.has(comment._id!),
        replies: repliesWithStatus
      };
    });
    
    console.log(`[COMMENTS-GET] ✅ Fetched ${commentsWithUserStatus.length} comments with interactions from ${comments === CacheService.get(cacheKey) ? 'cache' : 'MongoDB'}`);
    
    return NextResponse.json({
      success: true,
      comments: commentsWithUserStatus,
      count: commentsWithUserStatus.length,
      database: 'MongoDB',
      cached: comments === CacheService.get(cacheKey),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[COMMENTS-GET] ❌ Failed to get comments:', error);
    
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriPreview: process.env.MONGODB_URI ? 
        process.env.MONGODB_URI.substring(0, 20) + '...' : 'NOT_SET'
    };
    
    console.error('[COMMENTS-GET] Error details:', errorInfo);
    
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

    // Invalidate cache after adding new comment
    CacheService.invalidateComments(episodeViewing);

    console.log(`[COMMENTS-POST] New comment added to MongoDB: ${savedComment._id}`);

    return NextResponse.json({
      success: true,
      comment: savedComment,
      database: 'MongoDB',
      message: 'Comment submitted successfully and pending approval'
    });
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
