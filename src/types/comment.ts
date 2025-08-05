export interface Comment {
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
}

export interface CommentFormData {
  userName: string;
  content: string;
  episodeViewing?: number; 
}

export interface CommentStats {
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  commentsToday: number;
}
