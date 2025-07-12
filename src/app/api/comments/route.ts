import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

// GET - Fetch all approved comments
export async function GET() {
  try {
    const comments = await DatabaseService.getApprovedComments();
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Add new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, content, episodeViewing } = body;

    // Validation
    if (!userName || !content) {
      return NextResponse.json(
        { success: false, error: 'User name and content are required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Comment is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    const comment = await DatabaseService.addComment({
      id: crypto.randomUUID(),
      userName: userName.trim(),
      content: content.trim(),
      isApproved: true, // Auto-approve comments for public use
      userAgent,
      ipAddress,
      episodeViewing: episodeViewing || null
    });

    return NextResponse.json({ 
      success: true, 
      comment,
      message: 'Comment submitted and pending approval' 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
