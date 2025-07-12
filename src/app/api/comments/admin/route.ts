import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

// Database-based admin authentication
async function validateAdminPassword(password: string): Promise<boolean> {
  // Try default username "admin" 
  return await DatabaseService.verifyAdminPassword('admin', password);
}

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

    const isValid = await validateAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Initialize database
    await DatabaseService.initDatabase();

    const comments = await DatabaseService.getAllComments();
    const stats = await DatabaseService.getStats();

    return NextResponse.json({ 
      success: true, 
      comments, 
      stats 
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

    const isValid = await validateAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Initialize database
    await DatabaseService.initDatabase();
    
    if (action === 'toggle-approval') {
      const success = await DatabaseService.toggleApproval(commentId);
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

    if (action === 'delete') {
      const success = await DatabaseService.deleteComment(commentId);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Comment deleted successfully' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
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
