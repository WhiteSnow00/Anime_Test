import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { verifyToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentCommentId, content, episodeViewing } = body;

    console.log(`[REPLY-POST] Data received: parentComment=${parentCommentId}, content length=${content?.length}, episode=${episodeViewing}`);

    // Check if user is authenticated - REQUIRED for replies
    let userId: string | undefined;
    let userName: string | undefined;
    let displayName: string | undefined;
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: 'Please login to reply to comments',
          requiresAuth: true
        },
        { status: 401 }
      );
    }

    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
      
      // Get user details to fetch displayName
      const user = await MongoDBExtendedService.getUserById(userId);
      if (user) {
        userName = user.username;
        displayName = user.displayName;
      }
      
      console.log(`[REPLY-POST] Authenticated user reply: userId=${userId}, userName=${userName}, displayName=${displayName}`);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid authentication',
          message: 'Your session has expired. Please login again.',
          requiresAuth: true
        },
        { status: 401 }
      );
    }

    // Validate input
    if (!parentCommentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parent comment ID is required' 
        },
        { status: 400 }
      );
    }

    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reply content cannot be empty' 
        },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reply content is too long (max 1000 characters)' 
        },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    // Add reply
    const savedReply = await MongoDBExtendedService.addCommentReply(
      parentCommentId,
      {
        userName: userName!,
        displayName,
        userId,
        content: content.trim(),
        userAgent,
        ipAddress,
        episodeViewing
      }
    );

    console.log(`[REPLY-POST] New reply added: ${savedReply._id}`);

    return NextResponse.json({
      success: true,
      reply: savedReply,
      message: 'Reply submitted successfully'
    });

  } catch (error) {
    console.error('[REPLY-POST] Failed to add reply:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add reply',
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

    console.log(`[REPLY-GET] Fetching replies for comment: ${commentId}`);

    // Get replies
    const replies = await MongoDBExtendedService.getCommentReplies(commentId, false);

    // Get user information to determine like status for each reply
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

    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'localhost';

    // Get like status for each reply
    const repliesWithLikeStatus = await Promise.all(
      replies.map(async (reply) => {
        const likeStatus = await MongoDBExtendedService.getCommentLikeStatus(
          reply._id!,
          userId,
          ipAddress
        );

        return {
          ...reply,
          likeCount: likeStatus.likeCount,
          userLiked: likeStatus.userLiked
        };
      })
    );

    console.log(`[REPLY-GET] Retrieved ${repliesWithLikeStatus.length} replies`);

    return NextResponse.json({
      success: true,
      replies: repliesWithLikeStatus,
      count: repliesWithLikeStatus.length
    });

  } catch (error) {
    console.error('[REPLY-GET] Failed to get replies:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get replies',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
