import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Encryption settings
const ENCRYPTION_KEY = process.env.COMMENT_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!'; // 32 characters
const ALGORITHM = 'aes-256-cbc';

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

// Encrypt data
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

// Decrypt data
function decrypt(encryptedData: string, iv: string): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get comments file path
function getCommentsFilePath(): string {
  return path.join(process.cwd(), 'data', 'comments.json');
}

// Read encrypted comments from file
async function readComments(): Promise<Comment[]> {
  try {
    const filePath = getCommentsFilePath();
    
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(filePath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, return empty array
      return [];
    }

    const encryptedContent = await fs.readFile(filePath, 'utf8');
    
    if (!encryptedContent.trim()) {
      return [];
    }

    const { encryptedData, iv } = JSON.parse(encryptedContent);
    const decryptedData = decrypt(encryptedData, iv);
    const comments = JSON.parse(decryptedData);
    
    // Convert timestamp strings back to Date objects
    return comments.map((comment: any) => ({
      ...comment,
      timestamp: comment.timestamp
    }));
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
    
    // Create data directory if it doesn't exist
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

// GET - Retrieve all approved comments
export async function GET() {
  try {
    const comments = await readComments();
    const approvedComments = comments
      .filter(comment => comment.isApproved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json({ success: true, comments: approvedComments });
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

    // Validate input
    if (!userName || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Create new comment
    const newComment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      userName: userName.trim(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isApproved: true, // Auto-approve for now
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: ipAddress,
      episodeViewing: episodeViewing
    };

    // Read existing comments, add new one, and save
    const comments = await readComments();
    comments.unshift(newComment); // Add to beginning
    await writeComments(comments);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
