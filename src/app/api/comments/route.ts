import { NextRequest, NextResponse } from 'next/server';
import { SimpleMongoDBService } from '@/lib/simple-mongodb-service';
import { MongoDBExtendedService } from '@/lib/mongodb-extended-service';
import { verifyToken } from '@/lib/auth-utils';

const RATE_LIMITS = {
  GET: { limit: 30, window: 60000 },
  POST: { limit: 5, window: 60000 }
};
const CONTENT_LIMITS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 1000,
  MAX_USERNAME: 50
};
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || record.resetTime < now) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}
const REPEATED_CHAR_PATTERN = /(.)\1{9,}/;
const URL_EXTRACT_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const SUSPICIOUS_URL_PATTERNS = [
  /casino/i, /poker/i, /gambling/i, /bet365/i,
  /porn/i, /xxx/i, /adult/i,
  /bit\.ly/i, /tinyurl/i, /adf\.ly/i,
  /earn.*money/i, /get.*rich/i, /forex/i
];

function validateCommentInput(content: string, userName: string): { valid: boolean; error?: string } {
  if (!content?.trim() || !userName?.trim()) {
    return { valid: false, error: 'Tên và nội dung không được để trống' };
  }
  
  if (content.length > CONTENT_LIMITS.MAX_LENGTH) {
    return { valid: false, error: `Nội dung quá dài (tối đa ${CONTENT_LIMITS.MAX_LENGTH} ký tự)` };
  }
  
  if (content.length < CONTENT_LIMITS.MIN_LENGTH) {
    return { valid: false, error: `Nội dung quá ngắn (tối thiểu ${CONTENT_LIMITS.MIN_LENGTH} ký tự)` };
  }
  
  if (userName.length > CONTENT_LIMITS.MAX_USERNAME) {
    return { valid: false, error: `Tên quá dài (tối đa ${CONTENT_LIMITS.MAX_USERNAME} ký tự)` };
  }
  
  if (REPEATED_CHAR_PATTERN.test(content)) {
    return { valid: false, error: 'Nội dung có dấu hiệu spam' };
  }
  
  const urls = content.match(URL_EXTRACT_REGEX) || [];
  
  if (urls.length > 3) {
    return { valid: false, error: 'Quá nhiều liên kết (tối đa 3)' };
  }
  
  for (const url of urls) {
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url)) {
        return { valid: false, error: 'Liên kết không được phép' };
      }
    }
  }
  
  return { valid: true };
}

function sanitizeInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;'); // Removed forward slash escaping to preserve valid URLs
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0] || realIp || 'localhost';
}

function generateRequestId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

async function getUserInfo(token: string | undefined) {
  if (!token) return { userId: undefined, userRole: undefined, displayName: undefined };
  
  try {
    const decoded = verifyToken(token);
    const user = await SimpleMongoDBService.getUserById(decoded.userId);
    return {
      userId: decoded.userId,
      userRole: user?.role,
      displayName: user?.displayName,
      username: user?.username
    };
  } catch {
    return { userId: undefined, userRole: undefined, displayName: undefined };
  }
}

function createErrorResponse(
  error: unknown,
  requestId: string,
  responseTime: number
): NextResponse {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'Có lỗi xảy ra';
  let canRetry = false;

  if (error instanceof Error) {
    const msg = error.message;
    
    if (msg.includes('validation') || msg.includes('Invalid')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = msg;
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
      statusCode = 503;
      errorCode = 'DATABASE_ERROR';
      errorMessage = 'Không thể kết nối đến cơ sở dữ liệu';
      canRetry = true;
    } else if (msg.includes('E11000') || msg.includes('duplicate')) {
      statusCode = 409;
      errorCode = 'DUPLICATE_ERROR';
      errorMessage = 'Nội dung trùng lặp';
    } else if (msg.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT';
      errorMessage = 'Vui lòng thử lại sau';
      canRetry = true;
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        canRetry
      }
    },
    {
      status: statusCode,
      headers: {
        'X-Request-Id': requestId,
        'X-Response-Time': `${responseTime}ms`,
        ...(canRetry && { 'Retry-After': '60' })
      }
    }
  );
}
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    const clientIp = getClientIp(request);
    
    if (!checkRateLimit(`get:${clientIp}`, RATE_LIMITS.GET.limit, RATE_LIMITS.GET.window)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Too many requests',
          message: 'Vui lòng thử lại sau ít phút',
          retryAfter: 60
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMITS.GET.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMITS.GET.window).toISOString()
          }
        }
      );
    }
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const sortBy = searchParams.get('sort') || 'newest';
    const filterApproved = searchParams.get('approved') !== 'false';
    
    const token = request.cookies.get('auth-token')?.value;
    const { userId, userRole } = await getUserInfo(token);
    
    const allComments = await MongoDBExtendedService.getCommentsWithInteractions(
      episodeId ? parseInt(episodeId) : undefined
    );
    const baseComments = filterApproved
      ? allComments.filter((c: any) => c.isApproved)
      : allComments;

    const totalCount = baseComments.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const pageSlice = baseComments.slice(startIndex, endIndex);

    const pageIds: string[] = [];
    for (const c of pageSlice) {
      if (c._id) pageIds.push(c._id);
      if (c.replies && Array.isArray(c.replies)) {
        for (const r of c.replies) {
          if (r._id) pageIds.push(r._id);
        }
      }
    }

    const userLikedComments = pageIds.length
      ? await MongoDBExtendedService.getUserLikeHistory(userId, clientIp, pageIds)
      : [];
    const likedSet = new Set(userLikedComments);

    const paginatedComments = pageSlice.map((comment: any) => ({
      ...comment,
      userLiked: likedSet.has(comment._id),
      replies: comment.replies?.map((r: any) => ({
        ...r,
        userLiked: likedSet.has(r._id)
      })) || []
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: true,
        comments: paginatedComments,
        count: paginatedComments.length,
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        database: 'MongoDB',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
          'X-Response-Time': `${responseTime}ms`,
          'X-Request-Id': requestId,
          'X-Total-Count': String(totalCount),
          'X-Total-Pages': String(totalPages)
        }
      }
    );
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[COMMENTS-GET] Error:`, error);
    return createErrorResponse(error, requestId, responseTime);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    const clientIp = getClientIp(request);
    
    if (!checkRateLimit(`post:${clientIp}`, RATE_LIMITS.POST.limit, RATE_LIMITS.POST.window)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded',
          message: 'Bạn đã gửi quá nhiều bình luận. Vui lòng thử lại sau 1 phút',
          retryAfter: 30
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMITS.POST.limit),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }
    
  const body = await request.json();
  const { userName: rawUserName, content: rawContent, episodeViewing } = body;
  let userName = rawUserName;
  let content = rawContent;
    
    const validation = validateCommentInput(content, userName);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          message: validation.error,
          field: validation.error?.includes('Tên') ? 'userName' : 'content'
        },
        { status: 400 }
      );
    }
    
    userName = sanitizeInput(userName.trim());
    content = sanitizeInput(content.trim());
    
    const token = request.cookies.get('auth-token')?.value;
    const userInfo = await getUserInfo(token);
    
    if (userInfo.username && userName !== userInfo.username) {
      userName = userInfo.username;
    }
    
    const commentData = {
      userName,
      displayName: userInfo.displayName,
      content,
      timestamp: new Date(),
      isApproved: true,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: clientIp,
      episodeViewing: episodeViewing ? parseInt(episodeViewing) : undefined,
      userId: userInfo.userId,
      userRole: userInfo.userRole,
      metadata: {
        requestId,
        source: 'web',
        version: '2.0'
      }
    };

    const savedComment = await SimpleMongoDBService.addComment(commentData);
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: true,
        comment: savedComment,
        database: 'MongoDB',
        message: 'Bình luận đã được gửi thành công',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Request-Id': requestId,
          'X-Response-Time': `${responseTime}ms`,
          'X-Comment-Id': savedComment._id?.toString() || ''
        }
      }
    );
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[COMMENTS-POST] Error:`, error);
    return createErrorResponse(error, requestId, responseTime);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
