"use client";

import { useState, useEffect } from 'react';
import { CommentService } from '@/lib/comment-service';
import { Comment, CommentFormData } from '@/types/comment';

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments from API
  const loadComments = async () => {
    setIsLoading(true);
    try {
      const allComments = await CommentService.getComments();
      setComments(allComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add comment via API
  const addComment = async (formData: CommentFormData): Promise<{ success: boolean; errors?: string[] }> => {
    setIsSubmitting(true);
    
    try {
      // Validate comment
      const errors = CommentService.validateComment(formData);
      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Add comment via API
      const newComment = await CommentService.addComment(formData);
      
      if (newComment) {
        // Reload comments to reflect changes
        await loadComments();
        return { success: true };
      } else {
        return { success: false, errors: ['Có lỗi xảy ra khi gửi bình luận'] };
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, errors: ['Có lỗi xảy ra, vui lòng thử lại'] };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, []);

  return {
    comments,
    isLoading,
    isSubmitting,
    addComment,
    refreshComments: loadComments,
  };
}

// Separate hook for admin functions
export function useAdminComments(password: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all comments (including unapproved)
  const loadComments = async () => {
    if (!password || password.trim() === '') {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/comments/admin?password=${encodeURIComponent(password)}`);
      const result = await response.json();
      
      if (result.success) {
        setComments(result.comments);
        setStats(result.stats);
      } else {
        console.error('Admin authentication failed:', result.error);
        setComments([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Error loading admin comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle approval (admin only)
  const toggleApproval = async (commentId: string) => {
    try {
      const response = await fetch('/api/comments/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'toggle-approval',
          commentId
        })
      });
      
      const result = await response.json();
      if (result.success) {
        await loadComments();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling approval:', error);
      return false;
    }
  };

  // Delete comment (admin only)
  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch('/api/comments/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'delete',
          commentId
        })
      });
      
      const result = await response.json();
      if (result.success) {
        await loadComments();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  };

  // Load comments on mount
  useEffect(() => {
    if (password && password.trim() !== '') {
      loadComments();
    } else {
      setIsLoading(false);
      setStats(null);
      setComments([]);
    }
  }, [password]);

  return {
    comments,
    stats,
    isLoading,
    toggleApproval,
    deleteComment,
    refreshComments: loadComments,
  };
}
