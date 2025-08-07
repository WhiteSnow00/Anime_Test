import { NextRequest, NextResponse } from 'next/server';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

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

    // Get auth token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Bạn cần đăng nhập để xóa bình luận'
      }, { status: 401 });
    }

    let user;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
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
    const isOwner = (comment.userId === user.userId) || 
                    (comment.userName === user.username);

    if (!isOwner) {
      return NextResponse.json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      }, { status: 403 });
    }

    // Delete the comment
    const success = await MongoDBExtendedService.deleteComment(commentId);

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
