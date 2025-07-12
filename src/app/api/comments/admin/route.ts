import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Encryption settings (same as main route)
const ENCRYPTION_KEY = process.env.COMMENT_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';
const ALGORITHM = 'aes-256-cbc';

// Generate secure admin password from environment
function getAdminPassword(): string {
  // Use environment variable for admin password
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is not set');
  }
  
  return adminPassword;
}

// Simple password validation - only one password accepted
function validateAdminPassword(password: string): boolean {
  return password === getAdminPassword();
}

interface Comment {
  id: string;
  userName: string;
  content: string;
  timestamp: string;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
}

// Decrypt data (same function as main route)
function decrypt(encryptedData: string, iv: string): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Encrypt data (same function as main route)
function encrypt(text: string): { encryptedData: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

// Get comments file path
function getCommentsFilePath(): string {
  return path.join(process.cwd(), 'data', 'comments.json');
}

// Read encrypted comments from file
async function readComments(): Promise<Comment[]> {
  try {
    const filePath = getCommentsFilePath();
    
    try {
      await fs.access(filePath);
    } catch {
      return [];
    }

    const encryptedContent = await fs.readFile(filePath, 'utf8');
    
    if (!encryptedContent.trim()) {
      return [];
    }

    const { encryptedData, iv } = JSON.parse(encryptedContent);
    const decryptedData = decrypt(encryptedData, iv);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error reading comments:', error);
    return [];
  }
}

// Write encrypted comments to file
async function writeComments(comments: Comment[]): Promise<void> {
  try {
    const filePath = getCommentsFilePath();
    const dataDir = path.dirname(filePath);
    
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    const jsonData = JSON.stringify(comments);
    const { encryptedData, iv } = encrypt(jsonData);
    const encryptedContent = JSON.stringify({ encryptedData, iv });
    
    await fs.writeFile(filePath, encryptedContent, 'utf8');
  } catch (error) {
    console.error('Error writing comments:', error);
    throw new Error('Failed to save comments');
  }
}

// GET - Get all comments for admin (including unapproved)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const password = url.searchParams.get('password');

    if (!password || !validateAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    const comments = await readComments();
    const sortedComments = comments.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let commentsToday = 0;
    let approvedComments = 0;

    comments.forEach(comment => {
      if (new Date(comment.timestamp) >= today) {
        commentsToday++;
      }
      if (comment.isApproved) {
        approvedComments++;
      }
    });

    const stats = {
      totalComments: comments.length,
      approvedComments,
      pendingComments: comments.length - approvedComments,
      commentsToday
    };

    return NextResponse.json({ 
      success: true, 
      comments: sortedComments, 
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

    if (!password || !validateAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    const comments = await readComments();
    
    if (action === 'toggle-approval') {
      const commentIndex = comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }

      comments[commentIndex].isApproved = !comments[commentIndex].isApproved;
      await writeComments(comments);

      return NextResponse.json({ 
        success: true, 
        message: 'Comment approval status updated' 
      });
    }

    if (action === 'delete') {
      const filteredComments = comments.filter(c => c.id !== commentId);
      if (filteredComments.length === comments.length) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }

      await writeComments(filteredComments);

      return NextResponse.json({ 
        success: true, 
        message: 'Comment deleted successfully' 
      });
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
