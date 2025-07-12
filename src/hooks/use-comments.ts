"use client";

import { useState, useEffect } from 'react';
import { CommentService } from '@/lib/comment-service';
import { Comment, CommentFormData } from '@/types/comment';

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  const loadComments = () => {
    setIsLoading(true);
    try {
      const allComments = CommentService.getApprovedComments();
      setComments(allComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add comment
  const addComment = async (formData: CommentFormData): Promise<{ success: boolean; errors?: string[] }> => {
    setIsSubmitting(true);
    
    try {
      // Validate comment
      const errors = CommentService.validateComment(formData);
      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Add comment
      const newComment = CommentService.addComment(formData);
      
      // Reload comments to reflect changes
      loadComments();
      
      return { success: true };
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
export function useAdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all comments (including unapproved)
  const loadComments = () => {
    setIsLoading(true);
    try {
      const allComments = CommentService.getAllCommentsAdmin();
      setComments(allComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle approval (admin only)
  const toggleApproval = (commentId: string) => {
    const success = CommentService.toggleApproval(commentId);
    if (success) {
      loadComments();
    }
    return success;
  };

  // Delete comment (admin only)
  const deleteComment = (commentId: string) => {
    const success = CommentService.deleteComment(commentId);
    if (success) {
      loadComments();
    }
    return success;
  };

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, []);

  return {
    comments,
    isLoading,
    toggleApproval,
    deleteComment,
    refreshComments: loadComments,
  };
}
