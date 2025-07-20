export interface Comment {
  _id?: string; // MongoDB ObjectId as string
  id?: string; // Optional custom ID
  userName: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent?: string;
  ipAddress?: string;
  episodeViewing?: number; // Track which episode user was watching when commenting
}

export interface CommentFormData {
  userName: string;
  content: string;
  episodeViewing?: number; // Current episode being watched
}

export interface CommentStats {
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  commentsToday: number;
}
