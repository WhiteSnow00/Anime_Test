import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Parse request body
    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json({
        success: false,
        message: 'ID bình luận không hợp lệ'
      }, { status: 400 });
    }

    // Connect to database
    const mongoService = new MongoDBExtendedService();
    await mongoService.connect();

    // Get the comment/reply to check ownership
    const comment = await mongoService.getCommentById(commentId);
    
    if (!comment) {
      await mongoService.disconnect();
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy bình luận'
      }, { status: 404 });
    }

    // Check if user is the owner
    let isOwner = false;
    
    if (session?.user) {
      // Check if the comment belongs to the logged-in user
      isOwner = (comment.userId === session.user.id) || 
                (comment.userName === session.user.username);
    }

    if (!isOwner) {
      await mongoService.disconnect();
      return NextResponse.json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      }, { status: 403 });
    }

    // Delete the comment
    const success = await mongoService.deleteComment(commentId);

    await mongoService.disconnect();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Đã xóa bình luận thành công'
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
