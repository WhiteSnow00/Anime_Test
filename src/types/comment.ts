export interface Comment {
  id: string;
  episodeId: number;
  userName: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export interface CommentFormData {
  userName: string;
  content: string;
  episodeId: number;
}

export interface CommentStats {
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  commentsToday: number;
  commentsByEpisode: Record<number, number>;
}
