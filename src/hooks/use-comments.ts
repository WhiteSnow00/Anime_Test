"use client";

import { useState, useEffect } from 'react';
import { CommentService } from '@/lib/comment-service';
import { Comment, CommentFormData } from '@/types/comment';

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addComment = async (formData: CommentFormData): Promise<{ success: boolean; errors?: string[] }> => {
    setIsSubmitting(true);
    try {
      const errors = CommentService.validateComment(formData);
      if (errors.length > 0) return { success: false, errors };

      const newComment = await CommentService.addComment(formData);
      if (!newComment) return { success: false, errors: ['Có lỗi xảy ra khi gửi bình luận'] };

      const enriched: Comment = {
        ...newComment,
        userRole: (newComment as any).userRole || (prevUserRoleForSameUser(comments, newComment.userId) ?? newComment.userRole)
      } as Comment;
      setComments(prev => [enriched, ...prev]);
      return { success: true };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, errors: ['Có lỗi xảy ra, vui lòng thử lại'] };
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeComment = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
  };

  useEffect(() => {
    loadComments();
  }, []);

  return {
    comments,
    setComments,
    isLoading,
    isSubmitting,
    addComment,
    removeComment,
    refreshComments: loadComments,
  };
}

function prevUserRoleForSameUser(list: Comment[], userId?: string) {
  if (!userId) return undefined;
  const found = list.find(c => c.userId === userId && c.userRole);
  return found?.userRole;
}

export function useAdminComments(password: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
