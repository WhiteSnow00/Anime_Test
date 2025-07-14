import { NextRequest, NextResponse } from 'next/server';
import { CommentService } from '@/lib/unified-comment-service';

// GET - Get all comments for admin (including unapproved)
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

    // Use unified comment service for admin authentication and data retrieval
    const result = await CommentService.getAllCommentsAdmin(password);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      comments: result.comments, 
      stats: result.stats 
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Admin actions (approve/unapprove, delete)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action, commentId } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 401 }
      );
    }

    // Validate admin first
    const admin = await CommentService.validateAdmin('admin', password);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (action === 'toggle-approval') {
      const success = await CommentService.toggleApproval(commentId, password);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Comment approval status updated' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Comment not found or permission denied' },
          { status: 404 }
        );
      }
    }

    if (action === 'delete') {
      const success = await CommentService.deleteComment(commentId, password);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Comment deleted successfully' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Comment not found or permission denied' },
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
