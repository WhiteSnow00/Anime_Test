import { NextResponse } from 'next/server';
import { MongoDBService } from '@/lib/mongodb-service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'anime-streaming-jwt-secret-key-2024-mongodb-migration';

// Helper function to verify JWT token
function verifyToken(request: Request): { isValid: boolean; admin?: any } {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return { isValid: true, admin: decoded };
  } catch {
    return { isValid: false };
  }
}

// Admin login
export async function POST(request: Request) {
  try {
    const { action, username, password, commentId } = await request.json();

    if (action === 'login') {
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }

      // Validate admin credentials
      const admin = await MongoDBService.validateAdmin(username, password);
      if (!admin) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminId: admin._id,
          username: admin.username,
          role: admin.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          lastLogin: admin.lastLogin
        }
      });

    } else if (action === 'approve-comment') {
      // Verify admin token
      const { isValid, admin } = verifyToken(request);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!commentId) {
        return NextResponse.json(
          { error: 'Comment ID is required' },
          { status: 400 }
        );
      }

      const success = await MongoDBService.approveComment(commentId);
      if (!success) {
        return NextResponse.json(
          { error: 'Comment not found or already approved' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Comment approved successfully'
      });

    } else if (action === 'delete-comment') {
      // Verify admin token
      const { isValid, admin } = verifyToken(request);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!commentId) {
        return NextResponse.json(
          { error: 'Comment ID is required' },
          { status: 400 }
        );
      }

      const success = await MongoDBService.deleteComment(commentId);
      if (!success) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Comment deleted successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get admin info (requires authentication)
export async function GET(request: Request) {
  try {
    const { isValid, admin } = verifyToken(request);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all comments for admin panel
    const comments = await MongoDBService.getComments();
    
    return NextResponse.json({
      success: true,
      admin: {
        username: admin.username,
        role: admin.role
      },
      stats: {
        totalComments: comments.length,
        approvedComments: comments.filter(c => c.isApproved).length,
        pendingComments: comments.filter(c => !c.isApproved).length
      },
      comments: comments.map(comment => ({
        id: comment.id,
        userName: comment.userName,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
        timestamp: comment.timestamp,
        isApproved: comment.isApproved,
        episodeViewing: comment.episodeViewing
      }))
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
