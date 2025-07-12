"use client";

import { Comment, CommentFormData } from '@/types/comment';

const STORAGE_KEY = 'anime-comments';
const ADMIN_PASSWORD = '826264';

export class CommentService {
  // Get all comments from localStorage
  static getComments(): Comment[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const comments = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return comments.map((comment: any) => ({
        ...comment,
        timestamp: new Date(comment.timestamp)
      }));
    } catch (error) {
      console.error('Error loading comments:', error);
      return [];
    }
  }

  // Save comments to localStorage
  static saveComments(comments: Comment[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }

  // Generate unique ID
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Add new comment
  static addComment(formData: CommentFormData): Comment {
    const comments = this.getComments();
    
    const newComment: Comment = {
      id: this.generateId(),
      userName: formData.userName.trim(),
      content: formData.content.trim(),
      timestamp: new Date(),
      isApproved: true, // Auto-approve for now, can be changed to false for moderation
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ipAddress: 'localhost' // In real app, get from server
    };

    comments.unshift(newComment); // Add to beginning for newest first
    this.saveComments(comments);
    
    return newComment;
  }

  // Get all approved comments for public display
  static getApprovedComments(): Comment[] {
    return this.getComments()
      .filter(comment => comment.isApproved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get all comments for admin (including unapproved)
  static getAllCommentsAdmin(): Comment[] {
    return this.getComments()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Approve/Unapprove comment
  static toggleApproval(commentId: string): boolean {
    const comments = this.getComments();
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) return false;
    
    comments[commentIndex].isApproved = !comments[commentIndex].isApproved;
    this.saveComments(comments);
    
    return true;
  }

  // Delete comment
  static deleteComment(commentId: string): boolean {
    const comments = this.getComments();
    const filteredComments = comments.filter(c => c.id !== commentId);
    
    if (filteredComments.length === comments.length) return false;
    
    this.saveComments(filteredComments);
    return true;
  }

  // Get comment statistics
  static getStats() {
    const comments = this.getComments();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let commentsToday = 0;
    let approvedComments = 0;

    comments.forEach(comment => {
      // Count today's comments
      if (comment.timestamp >= today) {
        commentsToday++;
      }
      
      // Count approved comments
      if (comment.isApproved) {
        approvedComments++;
      }
    });

    return {
      totalComments: comments.length,
      approvedComments,
      pendingComments: comments.length - approvedComments,
      commentsToday
    };
  }

  // Validate admin password
  static validateAdminPassword(password: string): boolean {
    return password === ADMIN_PASSWORD;
  }

  // Format relative time in Vietnamese
  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'vừa xong';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // Validate comment content
  static validateComment(formData: CommentFormData): string[] {
    const errors: string[] = [];

    if (!formData.userName.trim()) {
      errors.push('Vui lòng nhập tên của bạn');
    } else if (formData.userName.trim().length < 2) {
      errors.push('Tên phải có ít nhất 2 ký tự');
    } else if (formData.userName.trim().length > 50) {
      errors.push('Tên không được quá 50 ký tự');
    }

    if (!formData.content.trim()) {
      errors.push('Vui lòng nhập nội dung bình luận');
    } else if (formData.content.trim().length < 3) {
      errors.push('Bình luận phải có ít nhất 3 ký tự');
    } else if (formData.content.trim().length > 1000) {
      errors.push('Bình luận không được quá 1000 ký tự');
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /https?:\/\/[^\s]+/gi, // URLs
      /\b(?:spam|bot|fake)\b/gi, // Spam keywords
    ];

    const content = formData.content.toLowerCase();
    if (spamPatterns.some(pattern => pattern.test(content))) {
      errors.push('Nội dung có vẻ như spam, vui lòng thử lại');
    }

    return errors;
  }
}
