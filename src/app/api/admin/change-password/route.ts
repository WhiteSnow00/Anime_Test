import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

// POST - Change admin password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Change password using default admin username
    const success = await DatabaseService.changeAdminPassword('admin', currentPassword, newPassword);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
