"use client";

import { CommentService } from '@/lib/comment-service';
import { Comment } from '@/types/comment';

// Sample comments for testing (only for development)
const SAMPLE_COMMENTS: Comment[] = [
  {
    id: 'sample-1',
    userName: 'Anh Minh',
    content: 'Anime rất hay! Cảm động khi thấy Rintaro và Kaoruko gặp nhau. Story line rất cuốn hút, mong được xem tiếp theo.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-2',
    userName: 'Chị Linh',
    content: 'Animation rất đẹp, studio CloverWorks làm tốt lắm! Nhạc nền cũng phù hợp với không khí của truyện. Character design dễ thương.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-3',
    userName: 'Bạn Nam',
    content: 'Mình đã đọc manga rồi nhưng anime vẫn khiến mình cảm động. Diễn viên lồng tiếng Nhật rất hay! Adaptation rất trung thành.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-4',
    userName: 'Thanh Hương',
    content: 'Bộ anime phát triển nhân vật rất tốt. Kaoruko dễ thương quá! Hy vọng tình cảm của 2 bạn sẽ tiến triển. Romance rất ngọt ngào.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    isApproved: true,
    userAgent: 'Sample User Agent',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'sample-5',
    userName: 'Anh Tuấn',
    content: 'Waiting cho season tiếp theo! Drama giữa 2 trường học thật thú vị. Cốt truyện rất hay và có chiều sâu.',
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
