import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { cookies } from 'next/headers';
import { isValidObjectId, verifyToken } from '@/lib/auth-utils';
import CacheService from '@/lib/cache-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json({
        success: false,
        message: 'ID bình luận không hợp lệ'
      }, { status: 400 });
    }

    // Validate ObjectId format
    if (!isValidObjectId(commentId)) {
      return NextResponse.json({
        success: false,
        message: 'Định dạng ID bình luận không hợp lệ'
      }, { status: 400 });
    }

    // Get the comment/reply to check ownership first
    const comment = await MongoDBExtendedService.getCommentById(commentId);
    
    if (!comment) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy bình luận'
      }, { status: 404 });
    }

    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    let user = null;
    let isOwner = false;

    // Try to authenticate with token (for logged-in users)
    if (token) {
      try {
        const decoded = verifyToken(token);
        user = decoded;

        // Logged-in users can ONLY delete their own comments (with userId)
        if (comment.userId) {
          // Compare userId strings (both should be converted to strings for safety)
          const userIdMatch = user.userId && 
                             comment.userId.toString() === user.userId.toString();
          
          // Compare usernames as fallback (case-insensitive)
          const usernameMatch = user.username && comment.userName &&
                               comment.userName.trim().toLowerCase() === user.username.trim().toLowerCase();
          
          isOwner = userIdMatch || usernameMatch;
        }
        // If comment has no userId (guest comment), logged-in user CANNOT delete it
        else {
          isOwner = false;
        }
      } catch (error) {
        // Invalid token, treat as guest
        user = null;
      }
    }

    // If not logged in, check IP-based ownership for guest comments ONLY
    if (!user && !comment.userId) {
      // This is a guest comment and user is not logged in, check IP match
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'unknown';
      
      const ipMatch = comment.ipAddress && clientIp && 
                     comment.ipAddress === clientIp;
      
      isOwner = ipMatch;

      console.log('Guest comment IP ownership check:', {
        commentIp: comment.ipAddress,
        clientIp: clientIp,
        ipMatch
      });
    }

    console.log('Delete ownership check:', {
      commentUserId: comment.userId,
      tokenUserId: user?.userId,
      commentUserName: comment.userName,
      tokenUsername: user?.username,
      isOwner,
      isGuestComment: !comment.userId,
      isLoggedIn: !!user
    });

    if (!isOwner) {
      return NextResponse.json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      }, { status: 403 });
    }

    // Delete the comment
    console.log('Attempting to delete comment:', commentId);
    const success = await MongoDBExtendedService.deleteComment(commentId);
    console.log('Delete result:', success);

    if (success) {
      // More targeted cache invalidation instead of clearing all caches
      CacheService.invalidateComments();
      
      return NextResponse.json({
        success: true,
        message: 'Đã xóa bình luận thành công',
        deletedId: commentId,
        comment: comment // Return comment info for client-side updates
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Không thể xóa bình luận'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa bình luận'
    }, { status: 500 });
  }
}
