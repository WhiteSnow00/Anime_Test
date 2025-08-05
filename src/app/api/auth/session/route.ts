import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        user: null
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from database
      const user = await SimpleMongoDBService.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        return NextResponse.json({
          success: false,
          authenticated: false,
          user: null
        });
      }

      // Update last login
      await SimpleMongoDBService.updateUserLastLogin(decoded.userId);

      return NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName
        }
      });
    } catch (error) {
      // Token is invalid or expired
      return NextResponse.json({
        success: false,
        authenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify session'
      },
      { status: 500 }
    );
  }
}
