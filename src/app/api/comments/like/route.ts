import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { verifyToken } from '@/lib/auth-utils';
import CacheService from '@/lib/cache-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, action } = body;

    if (!commentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Comment ID is required' 
        },
        { status: 400 }
      );
    }

    // Get user information
    let userId: string | undefined;
    const token = request.cookies.get('auth-token')?.value;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
        console.log(`[LIKE] Authenticated user like: userId=${userId}`);
      } catch (error) {
        console.log('[LIKE] Invalid token, proceeding as guest like');
      }
    }

    // Get IP address for anonymous likes
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';
    const userAgent = request.headers.get('user-agent') || '';

    console.log(`[LIKE] Processing like for comment ${commentId}, user=${userId || 'guest'}, ip=${ipAddress}`);

    // Toggle like
    const result = await MongoDBExtendedService.toggleCommentLike(
      commentId,
      userId,
      ipAddress,
      userAgent
    );

    // Invalidate cache after like toggle
    CacheService.clear('comments:');

    console.log(`[LIKE] Like toggled successfully: userLiked=${result.userLiked}, count=${result.likeCount}`);

    return NextResponse.json({
      success: true,
      likeCount: result.likeCount,
      userLiked: result.userLiked
    });

  } catch (error) {
    console.error('[LIKE] Failed to toggle like:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process like',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Comment ID is required' 
        },
        { status: 400 }
      );
    }

    // Get user information
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

    // Get IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    // Get like status
    const status = await MongoDBExtendedService.getCommentLikeStatus(
      commentId,
      userId,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      likeCount: status.likeCount,
      userLiked: status.userLiked
    });

  } catch (error) {
    console.error('[LIKE-GET] Failed to get like status:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get like status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
