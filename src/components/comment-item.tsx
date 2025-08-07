"use client";

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Heart, MessageCircle, User, Clock, Play, Shield, Send, Loader2, ChevronDown, ChevronUp, Trash2, MoreHorizontal } from 'lucide-react';
import { CommentService } from '@/lib/comment-service';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { useToast } from '@/hooks/use-toast';

interface CommentReply {
  _id?: string;
  parentCommentId?: string;
  id?: string;
  userName: string;
  displayName?: string;
  userId?: string;
  content: string;
  timestamp: Date | string;
  isApproved?: boolean;
  userAgent?: string;
  ipAddress?: string;
  episodeViewing?: number;
  likes?: any[];
  likeCount: number;
  userLiked?: boolean;
  replyTo?: string; 
}

interface CommentItemProps {
  comment: any;
  onReplyAdded?: (reply: CommentReply) => void;
  onLikeToggled?: (commentId: string, liked: boolean, likeCount: number) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function CommentItem({ comment, onReplyAdded, onLikeToggled, onCommentDeleted }: CommentItemProps) {
  const { isLoggedIn, user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(comment.userLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replies, setReplies] = useState<CommentReply[]>(comment.replies || []);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyToUsername, setReplyToUsername] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Mobile long-press delete functionality
  const [showMobileDelete, setShowMobileDelete] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? Math.max(0, likeCount - 1) : likeCount + 1);
    try {
      const response = await fetch('/api/comments/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId: comment._id,
          action: isLiked ? 'unlike' : 'like'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsLiked(data.userLiked);
        setLikeCount(data.likeCount);
        
        if (onLikeToggled) {
          onLikeToggled(comment._id, data.userLiked, data.likeCount);
        }
      } else {
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyClick = (username?: string) => {
    if (!isLoggedIn) {
      setAuthMessage('Vui lòng đăng nhập để trả lời bình luận');
      setShowAuthModal(true);
      return;
    }
    
    setShowReplyForm(!showReplyForm);
    setReplyError('');
    if (username) {
      setReplyToUsername(username);
      setReplyContent(`@${username} `);
    } else {
      setReplyToUsername('');
      setReplyContent('');
    }
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      setReplyError('Vui lòng nhập nội dung trả lời');
      return;
    }

    if (replyContent.length > 1000) {
      setReplyError('Nội dung trả lời quá dài (tối đa 1000 ký tự)');
      return;
    }

    setIsSubmittingReply(true);
    setReplyError('');

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentCommentId: comment._id,
          content: CommentService.processEmojis(replyContent.trim()),
          episodeViewing: comment.episodeViewing,
          replyTo: replyToUsername || undefined
        })
      });

      const data = await response.json();

      if (data.success && data.reply) {
        setReplies([...replies, data.reply]);
        setReplyContent('');
        setShowReplyForm(false);
        setReplyToUsername('');
        if (onReplyAdded) {
          onReplyAdded(data.reply);
        }
      } else if (data.requiresAuth) {
        setAuthMessage(data.message || 'Vui lòng đăng nhập để trả lời');
        setShowAuthModal(true);
      } else {
        setReplyError(data.message || 'Có lỗi xảy ra khi gửi trả lời');
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
      setReplyError('Không thể gửi trả lời. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const loadAllReplies = async () => {
    if (isLoadingReplies) return;
    
    setIsLoadingReplies(true);
    
    try {
      const response = await fetch(`/api/comments/reply?commentId=${comment._id}`);
      const data = await response.json();
      
      if (data.success && data.replies) {
        setReplies(data.replies);
        setShowAllReplies(true);
      }
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleDelete = async (skipConfirm = false) => {
    // Only show confirm dialog for desktop users or when explicitly needed
    if (!skipConfirm && window.innerWidth > 768) {
      if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/comments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId: comment._id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Show success toast
        toast({
          title: "Đã xóa bình luận",
          description: "Bình luận đã được xóa thành công",
          duration: 3000,
        });
        
        // Immediately hide the comment with a fade out effect
        const commentElement = document.querySelector(`[data-comment-id="${comment._id}"]`);
        if (commentElement) {
          commentElement.classList.add('opacity-50', 'pointer-events-none');
        }
        
        // Call the parent callback to remove from state
        if (onCommentDeleted) {
          setTimeout(() => {
            onCommentDeleted(comment._id);
          }, 300); // Small delay for visual feedback
        }
      } else {
        toast({
          title: "Lỗi xóa bình luận",
          description: data.message || 'Không thể xóa bình luận',
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast({
        title: "Lỗi xóa bình luận",
        description: 'Có lỗi xảy ra khi xóa bình luận',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mobile long-press handlers
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Only enable long-press for comment owners on mobile
    if (!isLoggedIn || !user || window.innerWidth > 768) return;
    if (!(comment.userId === user.id || comment.userName === user.username)) return;

    // Check if the touch/click is on a reply element or its children
    const target = e.target as HTMLElement;
    const replyElement = target.closest('[data-reply-container]');
    if (replyElement) {
      // Don't trigger parent comment long-press when touching replies
      return;
    }

    // Also check if touching action buttons area
    const actionButton = target.closest('button') || target.closest('[role="button"]');
    if (actionButton) {
      // Don't trigger long-press when clicking buttons
      return;
    }

    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      setShowMobileDelete(true);
      setIsLongPressing(false);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 800); // 800ms long press
  }, [isLoggedIn, user, comment.userId, comment.userName]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleMobileDelete = async () => {
    setShowMobileDelete(false);
    await handleDelete(true); // Skip confirm dialog since mobile already confirmed
  };

  const closeMobileDelete = () => {
    setShowMobileDelete(false);
  };

  const displayedReplies = showAllReplies ? replies : replies.slice(0, 3);
  const hasMoreReplies = replies.length > 3;

  return (
    <>
      <Card 
        className={cn(
          "p-3 sm:p-4 bg-muted/30 comment-item transition-all duration-300 relative",
          isLongPressing && "scale-[0.98] bg-muted/50",
          showMobileDelete && "ring-2 ring-destructive/20"
        )} 
        data-comment-id={comment._id}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Mobile Delete Overlay */}
        {showMobileDelete && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10 lg:hidden">
            <div className="bg-background/95 backdrop-blur rounded-lg p-4 shadow-lg border flex flex-col gap-3 min-w-[200px]">
              <p className="text-sm text-center font-medium">Xóa bình luận này?</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeMobileDelete}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMobileDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Xóa'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Long Press Progress Indicator */}
        {isLongPressing && (
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-destructive/30 flex items-center justify-center lg:hidden">
            <div className="w-4 h-4 rounded-full bg-destructive/20 animate-pulse" />
          </div>
        )}

        <div className="flex items-start gap-2 sm:gap-3">
          {/* Avatar */}
          <div className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0",
            comment.userId ? "bg-primary/20" : "bg-primary/10"
          )}>
            {comment.userId ? (
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            ) : (
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Comment Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm comment-username vietnamese-text">
                      {comment.displayName || comment.userName}
                    </span>
                    {comment.userId && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                        <Shield className="h-3 w-3 mr-1" />
                        Thành viên
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {comment.episodeViewing && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        Tập {comment.episodeViewing}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {CommentService.formatRelativeTime(new Date(comment.timestamp))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Options Menu - Desktop only, hidden on mobile (use long-press instead) */}
              {isLoggedIn && user && (
                (comment.userId === user.id || comment.userName === user.username) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hidden lg:flex"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDelete(false)}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Đang xóa...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa bình luận
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              )}
            </div>
            
            {/* Comment Content */}
            <p className="text-sm sm:text-base leading-relaxed comment-content vietnamese-text mb-3">
              {comment.content}
            </p>

            {/* Mobile Long-press Hint - Only show for comment owners on mobile */}
            {isLoggedIn && user && (comment.userId === user.id || comment.userName === user.username) && (
              <div className="text-xs text-muted-foreground mb-2 lg:hidden flex items-center gap-1">
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />
                Nhấn giữ để xóa bình luận
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Like Button - Always visible, no login required */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 gap-1",
                  isLiked && "text-red-500 hover:text-red-600"
                )}
                onClick={handleLikeToggle}
                disabled={isLiking}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isLiked && "fill-current"
                  )} 
                />
                <span className="text-xs font-medium">
                  {likeCount > 0 ? likeCount : 'Thích'}
                </span>
              </Button>
              
              {/* Reply Button - Always visible, prompts login if needed */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1"
                onClick={() => handleReplyClick()}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {replies.length > 0 ? `${replies.length} Trả lời` : 'Trả lời'}
                </span>
              </Button>
            </div>
            
            {/* Reply Form */}
            {showReplyForm && isLoggedIn && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Trả lời @${comment.displayName || comment.userName}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                      maxLength={1000}
                      disabled={isSubmittingReply}
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {replyContent.length}/1000
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowReplyForm(false);
                            setReplyContent('');
                            setReplyError('');
                          }}
                          disabled={isSubmittingReply}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleReplySubmit}
                          disabled={isSubmittingReply || !replyContent.trim()}
                        >
                          {isSubmittingReply ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Đang gửi...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-1" />
                              Gửi
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {replyError && (
                      <p className="text-xs text-destructive mt-1">{replyError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Replies Section */}
            {displayedReplies.length > 0 && (
              <div className="mt-4 space-y-3">
                {displayedReplies.map((reply: CommentReply) => (
                  <ReplyItem 
                    key={reply._id || reply.id} 
                    reply={reply}
                    parentCommentId={comment._id}
                    onReplyAdded={(newReply) => {
                      setReplies([...replies, newReply]);
                      if (onReplyAdded) onReplyAdded(newReply);
                    }}
                    onReplyDeleted={(replyId) => {
                      setReplies(replies.filter(r => r._id !== replyId));
                    }}
                  />
                ))}
                
                {/* Load More Replies Button */}
                {hasMoreReplies && !showAllReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-7 hover:bg-primary/5"
                    onClick={loadAllReplies}
                    disabled={isLoadingReplies}
                  >
                    {isLoadingReplies ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Xem thêm {replies.length - 3} trả lời
                      </>
                    )}
                  </Button>
                )}
                
                {/* Collapse Replies Button */}
                {showAllReplies && hasMoreReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-7 hover:bg-primary/5"
                    onClick={() => setShowAllReplies(false)}
                  >
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Thu gọn
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => {
          setShowAuthModal(false);
          if (isLoggedIn) {
            setShowReplyForm(true);
          }
        }}
      />
    </>
  );
}
interface ReplyItemProps {
  reply: CommentReply;
  parentCommentId: string;
  onReplyAdded?: (reply: CommentReply) => void;
  onReplyDeleted?: (replyId: string) => void;
}
function ReplyItem({ reply, parentCommentId, onReplyAdded, onReplyDeleted }: ReplyItemProps) {
  const { isLoggedIn, user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(reply.userLiked || false);
  const [likeCount, setLikeCount] = useState(reply.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Mobile long-press delete functionality
  const [showMobileDelete, setShowMobileDelete] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleReplyLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? Math.max(0, likeCount - 1) : likeCount + 1);
    
    try {
      const response = await fetch('/api/comments/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId: reply._id,
          action: isLiked ? 'unlike' : 'like'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsLiked(data.userLiked);
        setLikeCount(data.likeCount);
      } else {
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    } catch (error) {
      console.error('Failed to toggle reply like:', error);
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyClick = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    
    setShowReplyForm(!showReplyForm);
    setReplyContent(`@${reply.displayName || reply.userName} `);
    setReplyError('');
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      setReplyError('Vui lòng nhập nội dung trả lời');
      return;
    }

    setIsSubmittingReply(true);
    setReplyError('');

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentCommentId: parentCommentId,
          content: CommentService.processEmojis(replyContent.trim()),
          replyTo: reply.displayName || reply.userName
        })
      });

      const data = await response.json();

      if (data.success && data.reply) {
        setReplyContent('');
        setShowReplyForm(false);
        
        if (onReplyAdded) {
          onReplyAdded(data.reply);
        }
      } else {
        setReplyError(data.message || 'Có lỗi xảy ra khi gửi trả lời');
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
      setReplyError('Không thể gửi trả lời. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async (skipConfirm = false) => {
    // Only show confirm dialog for desktop users or when explicitly needed
    if (!skipConfirm && window.innerWidth > 768) {
      if (!confirm('Bạn có chắc chắn muốn xóa trả lời này?')) return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/comments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId: reply._id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Đã xóa trả lời",
          description: "Trả lời đã được xóa thành công",
          duration: 3000,
        });
        
        if (onReplyDeleted) {
          onReplyDeleted(reply._id!);
        }
      } else {
        toast({
          title: "Lỗi xóa trả lời",
          description: data.message || 'Không thể xóa trả lời',
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
      toast({
        title: "Lỗi xóa trả lời",
        description: 'Có lỗi xảy ra khi xóa trả lời',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mobile long-press handlers for replies
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Only enable long-press for reply owners on mobile
    if (!isLoggedIn || !user || window.innerWidth > 768) return;
    if (!(reply.userId === user.id || reply.userName === user.username)) return;

    // Stop event from bubbling up to parent comment
    e.stopPropagation();

    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      setShowMobileDelete(true);
      setIsLongPressing(false);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 800); // 800ms long press
  }, [isLoggedIn, user, reply.userId, reply.userName]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Stop event from bubbling up to parent comment
    e.stopPropagation();
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleMobileDelete = async () => {
    setShowMobileDelete(false);
    await handleDelete(true); // Skip confirm dialog since mobile already confirmed
  };

  const closeMobileDelete = () => {
    setShowMobileDelete(false);
  };

  return (
    <>
    <div className={cn(
      "flex items-start gap-2 bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-all relative",
      isLongPressing && "scale-[0.98] bg-muted/40",
      showMobileDelete && "ring-2 ring-destructive/20"
    )}
    data-reply-container="true"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    onTouchCancel={handleTouchEnd}
    onMouseDown={handleTouchStart}
    onMouseUp={handleTouchEnd}
    onMouseLeave={handleTouchEnd}
    >
      {/* Mobile Delete Overlay for Replies */}
      {showMobileDelete && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10 lg:hidden">
          <div className="bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg border flex flex-col gap-2 min-w-[180px]">
            <p className="text-xs text-center font-medium">Xóa trả lời này?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeMobileDelete}
                className="flex-1 text-xs h-7"
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMobileDelete}
                disabled={isDeleting}
                className="flex-1 text-xs h-7"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Xóa'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Long Press Progress Indicator for Replies */}
      {isLongPressing && (
        <div className="absolute top-1 right-1 w-6 h-6 rounded-full border-2 border-destructive/30 flex items-center justify-center lg:hidden">
          <div className="w-3 h-3 rounded-full bg-destructive/20 animate-pulse" />
        </div>
      )}

      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        reply.userId ? "bg-primary/20" : "bg-muted"
      )}>
        {reply.userId ? (
          <Shield className="h-3 w-3 text-primary" />
        ) : (
          <User className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="font-medium text-xs text-foreground/90">
              {reply.displayName || reply.userName}
            </span>
            {reply.userId && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1 h-4">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                TV
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              • {CommentService.formatRelativeTime(new Date(reply.timestamp))}
            </span>
          </div>
          
          {/* Options Menu for Reply - Desktop only, hidden on mobile (use long-press instead) */}
          {isLoggedIn && user && (
            (reply.userId === user.id || reply.userName === user.username) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 -mt-1 hidden lg:flex"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(false)}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive text-xs"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3 mr-1.5" />
                        Xóa trả lời
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
        </div>
        
        <p className="text-sm leading-relaxed text-foreground/80 mb-1.5">
          {reply.replyTo && (
            <span className="text-primary font-medium">@{reply.replyTo} </span>
          )}
          {reply.content}
        </p>

        {/* Mobile Long-press Hint for Replies - Only show for reply owners on mobile */}
        {isLoggedIn && user && (reply.userId === user.id || reply.userName === user.username) && (
          <div className="text-[10px] text-muted-foreground mb-1 lg:hidden flex items-center gap-1">
            <span className="w-0.5 h-0.5 bg-muted-foreground rounded-full animate-pulse" />
            Nhấn giữ để xóa
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-1.5 gap-1 -ml-1.5 hover:bg-transparent",
              isLiked && "text-red-500 hover:text-red-600"
            )}
            onClick={handleReplyLike}
            disabled={isLiking}
          >
            <Heart 
              className={cn(
                "h-3 w-3",
                isLiked && "fill-current"
              )} 
            />
            <span className="text-[11px] font-medium">
              {likeCount > 0 ? likeCount : 'Thích'}
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 gap-1 hover:bg-transparent"
            onClick={handleReplyClick}
          >
            <MessageCircle className="h-3 w-3" />
            <span className="text-[11px] font-medium">Trả lời</span>
          </Button>
        </div>
      </div>
    </div>
    
    {/* Reply Form */}
    {showReplyForm && isLoggedIn && (
      <div className="ml-8 mt-2 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Shield className="h-2.5 w-2.5 text-primary" />
          </div>
          <div className="flex-1">
            <Textarea
              placeholder={`Trả lời @${reply.displayName || reply.userName}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] resize-none text-xs"
              maxLength={500}
              disabled={isSubmittingReply}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {replyContent.length}/500
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                    setReplyError('');
                  }}
                  disabled={isSubmittingReply}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={handleReplySubmit}
                  disabled={isSubmittingReply || !replyContent.trim()}
                >
                  {isSubmittingReply ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Gửi
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Gửi
                    </>
                  )}
                </Button>
              </div>
            </div>
            {replyError && (
              <p className="text-[10px] text-destructive mt-1">{replyError}</p>
            )}
          </div>
        </div>
      </div>
    )}
    
    {/* Auth Modal */}
    <AuthModal 
      isOpen={showAuthModal} 
      onClose={() => {
        setShowAuthModal(false);
        if (isLoggedIn) {
          setShowReplyForm(true);
        }
      }}
    />
    </>
  );
}
