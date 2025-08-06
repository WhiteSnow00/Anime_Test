import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';
import { generateToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, confirmPassword, email, displayName } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Cần điền tên đăng nhập và mật khẩu' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập phải từ 3 đến 20 ký tự' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9@#$_-]+$/.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập chỉ có thể chứa chữ cái, số, @, #, $, dấu gạch dưới và dấu gạch ngang' },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu không khớp' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng email không hợp lệ' },
        { status: 400 }
      );
    }

    // Create user
    const user = await SimpleMongoDBService.createUser(username, password, email, displayName);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Đăng ký thất bại' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie with httpOnly flag for security
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      },
      token
    });

    // Set secure cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message === 'Username already exists') {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
