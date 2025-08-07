// Extended types for the enhanced comment system with likes and replies

export interface CommentLike {
  userId?: string;        // For authenticated users
  ipAddress: string;      // For guest users (anonymous likes)
  timestamp: Date;
  userAgent?: string;
}

export interface CommentReply {
  _id?: string;
  parentCommentId: string;   // Reference to parent comment
  id: string;                // Unique identifier  
  userName: string;          // Reply author name
  displayName?: string;      // Display name if different
  userId?: string;           // If authenticated user
  content: string;           // Reply content
  timestamp: Date;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
  likes: CommentLike[];      // Replies can also be liked
  likeCount: number;
}

export interface ExtendedComment {
  _id?: string;
  userName: string;
  displayName?: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent?: string;
  ipAddress?: string;
  episodeViewing?: number;
  userId?: string;
  // New fields for likes and replies
  likes: CommentLike[];
  likeCount: number;
  replies?: CommentReply[];
  replyCount: number;
}

export interface LikeActionResult {
  success: boolean;
  likeCount: number;
  userLiked: boolean;
  error?: string;
}

export interface ReplyActionResult {
  success: boolean;
  reply?: CommentReply;
  error?: string;
}

export interface CommentWithReplies extends ExtendedComment {
  replies: CommentReply[];
}
