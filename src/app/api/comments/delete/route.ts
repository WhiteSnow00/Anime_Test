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

    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Bạn cần đăng nhập để xóa bình luận'
      }, { status: 401 });
    }

    let user;
    try {
      const decoded = verifyToken(token);
      user = decoded;
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Token không hợp lệ'
      }, { status: 401 });
    }

    // Get the comment/reply to check ownership
    const comment = await MongoDBExtendedService.getCommentById(commentId);
    
    if (!comment) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy bình luận'
      }, { status: 404 });
    }

    // Check if user is the owner
    // Compare userId strings (both should be converted to strings for safety)
    const userIdMatch = comment.userId && user.userId && 
                       comment.userId.toString() === user.userId.toString();
    
    // Compare usernames as fallback (case-insensitive)
    const usernameMatch = comment.userName && user.username && 
                         comment.userName.trim().toLowerCase() === user.username.trim().toLowerCase();
    
    const isOwner = userIdMatch || usernameMatch;

    console.log('Delete ownership check:', {
      commentUserId: comment.userId,
      tokenUserId: user.userId,
      commentUserName: comment.userName,
      tokenUsername: user.username,
      userIdMatch,
      usernameMatch,
      isOwner
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
