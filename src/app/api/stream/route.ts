import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.STREAM_ENCRYPTION_KEY || 'kana-stream-protect-2025';
const ALGORITHM = 'aes-256-gcm';

interface StreamData {
  file: string;
  timestamp: number;
  session: string;
}

function encrypt(data: StreamData): { encrypted: string; tag: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString('base64'),
    tag: tag.toString('base64'),
    iv: iv.toString('base64')
  };
}

function decrypt(encrypted: string, tag: string, iv: string): StreamData | null {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      key, 
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { file } = await request.json();
    
    if (!file) {
      return NextResponse.json(
        { error: 'File parameter required' },
        { status: 400 }
      );
    }
    
    const streamData: StreamData = {
      file,
      timestamp: Date.now(),
      session: crypto.randomBytes(16).toString('hex')
    };
    
    const { encrypted, tag, iv } = encrypt(streamData);
    
    const streamToken = Buffer.from(JSON.stringify({
      e: encrypted,
      t: tag,
      i: iv
    })).toString('base64url');
    
    return NextResponse.json({
      streamUrl: `/api/stream/play?token=${streamToken}`,
      expiresIn: 300
    });
  } catch (error) {
    console.error('Stream encryption error:', error);
    return NextResponse.json(
      { error: 'Failed to generate stream URL' },
      { status: 500 }
    );
  }
}
