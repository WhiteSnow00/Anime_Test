"use client";

import { CommentService } from '@/lib/comment-service';
import { Comment } from '@/types/comment';

// Sample comments for testing (only for development)
const SAMPLE_COMMENTS: Comment[] = [
  {
    id: 'sample-1',
    episodeId: 1,
    userName: 'Anh Minh',
    content: 'Tập đầu rất hay! Cảm động khi thấy Rintaro và Kaoruko gặp nhau lần đầu. Mong được xem tập tiếp theo.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-2',
    episodeId: 1,
    userName: 'Chị Linh',
    content: 'Animation rất đẹp, studio CloverWorks làm tốt lắm! Nhạc nền cũng phù hợp với không khí của truyện.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-3',
    episodeId: 1,
    userName: 'Bạn Nam',
    content: 'Mình đã đọc manga rồi nhưng anime vẫn khiến mình cảm động. Diễn viên lồng tiếng Nhật rất hay!',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-4',
    episodeId: 2,
    userName: 'Thanh Hương',
    content: 'Tập 2 phát triển nhân vật rất tốt. Kaoruko dễ thương quá! Hy vọng tình cảm của 2 bạn sẽ tiến triển.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-5',
    episodeId: 2,
    userName: 'Anh Tuấn',
    content: 'Waiting cho tập 3! Drama giữa 2 trường học thật thú vị, không biết sẽ ra sao tiếp theo.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isApproved: false, // Pending approval
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  }
];

export function initializeSampleComments() {
  // Only initialize if in development and no comments exist
  if (process.env.NODE_ENV === 'development') {
    const existingComments = CommentService.getComments();
    
    if (existingComments.length === 0) {
      CommentService.saveComments(SAMPLE_COMMENTS);
      console.log('Sample comments initialized for development');
    }
  }
}

// Auto-initialize when module loads (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Delay initialization to avoid hydration issues
  setTimeout(() => {
    initializeSampleComments();
  }, 1000);
}
