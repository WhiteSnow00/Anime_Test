import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const password = url.searchParams.get('password');

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 401 }
      );
    }

    const admin = await MongoDBExtendedService.validateAdmin('admin', password);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    const allComments = await MongoDBExtendedService.getAllCommentsAdmin(password);
    if (!allComments) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    const enhancedComments = await Promise.all(
      allComments.comments.map(async (comment) => {

        const likeStatus = await MongoDBExtendedService.getCommentLikeStatus(
          comment._id!,
          undefined,
          undefined
        );

        const replies = await MongoDBExtendedService.getCommentReplies(
          comment._id!,
          true 
        );
        const repliesWithLikes = await Promise.all(
          replies.map(async (reply) => {
            const replyLikeStatus = await MongoDBExtendedService.getCommentLikeStatus(
              reply._id!,
              undefined,
              undefined
            );
            return {
              ...reply,
              likeCount: replyLikeStatus.likeCount
            };
          })
        );

        return {
          ...comment,
          likeCount: likeStatus.likeCount,
          replies: repliesWithLikes,
          replyCount: replies.length
        };
      })
    );

    const totalLikes = enhancedComments.reduce((sum, c) => sum + c.likeCount, 0);
    const totalReplies = enhancedComments.reduce((sum, c) => sum + c.replyCount, 0);
    const repliesWithLikes = enhancedComments.reduce((sum, c) => 
      sum + c.replies.reduce((rSum, r) => rSum + r.likeCount, 0), 0
    );
    
    const registeredComments = enhancedComments.filter(c => c.userId).length;
    const guestComments = enhancedComments.filter(c => !c.userId).length;
    
    const allReplies = enhancedComments.flatMap(c => c.replies);
    const registeredReplies = allReplies.filter(r => r.userId).length;
    const guestReplies = allReplies.filter(r => !r.userId).length;

    const enhancedStats = {
      ...allComments.stats,
      totalLikes,
      totalReplies,
      repliesWithLikes,
      registeredComments,
      guestComments,
      registeredReplies,
      guestReplies,
      totalInteractions: totalLikes + totalReplies,
      averageLikesPerComment: enhancedComments.length > 0 
        ? (totalLikes / enhancedComments.length).toFixed(1) 
        : '0',
      averageRepliesPerComment: enhancedComments.length > 0
        ? (totalReplies / enhancedComments.length).toFixed(1)
        : '0'
    };

    return NextResponse.json({ 
      success: true, 
      comments: enhancedComments, 
      stats: enhancedStats 
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action, commentId, replyId } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 401 }
      );
    }

    const admin = await MongoDBExtendedService.validateAdmin('admin', password);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (action === 'toggle-approval' && commentId) {
      const success = await MongoDBExtendedService.toggleApproval(commentId);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Comment approval status updated' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }
    }

    if (action === 'delete' && commentId) {
      const success = await MongoDBExtendedService.deleteComment(commentId);
      
      if (success) {
        const replies = await MongoDBExtendedService.getCommentReplies(commentId, true);
        for (const reply of replies) {
          await MongoDBExtendedService.deleteReply(reply._id!);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Comment and related data deleted successfully' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }
    }

    if (action === 'toggle-reply-approval' && replyId) {
      const success = await MongoDBExtendedService.toggleReplyApproval(replyId);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Reply approval status updated' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Reply not found' },
          { status: 404 }
        );
      }
    }

    if (action === 'delete-reply' && replyId) {
      const success = await MongoDBExtendedService.deleteReply(replyId);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Reply deleted successfully' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Reply not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing admin action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
