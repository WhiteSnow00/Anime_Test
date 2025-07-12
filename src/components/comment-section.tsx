"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useComments } from '@/hooks/use-comments';
import { CommentService } from '@/lib/comment-service';
import { MessageCircle, User, Clock, Send, Loader2, Smile, ChevronDown, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentSectionProps {
  currentEpisodeId?: number; // Track current episode being watched
  className?: string;
}

export function CommentSection({ currentEpisodeId, className }: CommentSectionProps) {
  const { comments, isLoading, isSubmitting, addComment } = useComments();
  const [formData, setFormData] = useState({
    userName: '',
    content: '',
    episodeViewing: currentEpisodeId
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEmojiHelper, setShowEmojiHelper] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setShowSuccess(false);

    const result = await addComment(formData);
    
    if (result.success) {
      setFormData({ userName: '', content: '', episodeViewing: currentEpisodeId });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setErrors(result.errors || ['Có lỗi xảy ra']);
    }
  };

  const handleInputChange = (field: 'userName' | 'content', value: string) => {
    // Process emojis for content field
    const processedValue = field === 'content' ? CommentService.processEmojis(value) : value;
    
    setFormData(prev => ({ 
      ...prev, 
      [field]: processedValue,
      episodeViewing: currentEpisodeId // Update episode tracking
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Insert emoji into content
  const insertEmoji = (emoji: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + emoji
    }));
  };

  return (
    <Card className={cn("w-full p-4 sm:p-6 mb-20 lg:mb-0", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Bình luận</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Hoa Thơm Kiêu Hãnh</p>
        </div>
      </div>

      {/* Comment Form */}
      <div className="comment-form-container">
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {/* Name Input - Full width on mobile */}
        <div className="space-y-2">
          <label htmlFor="userName" className="text-sm font-medium block">
            Tên của bạn *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="userName"
              type="text"
              placeholder="Nhập tên hiển thị..."
              value={formData.userName}
              onChange={(e) => handleInputChange('userName', e.target.value)}
              className="pl-10 h-11 text-base mobile-input"
              maxLength={50}
              disabled={isSubmitting}
            />
          </div>
        </div>        {/* Content Input */}
        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium block">
            Nội dung bình luận *
          </label>
          <div className="relative">
            <Textarea
              id="content"
              placeholder="Comment cái gì đó(có vấn đề gì về dịch thuật thì góp ý luôn)"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="min-h-[100px] resize-none pr-12 text-base leading-relaxed mobile-input"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-9 w-9 p-0 touch-target-lg"
              onClick={() => setShowEmojiHelper(!showEmojiHelper)}
              title="Thêm emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Emoji Helper */}
          <Collapsible open={showEmojiHelper} onOpenChange={setShowEmojiHelper}>
            <CollapsibleContent className="mt-2">
              <Card className="p-3 bg-muted/30 max-h-48 sm:max-h-60 overflow-y-auto emoji-helper-mobile">
                <div className="text-xs font-medium mb-2 flex items-center gap-2 sticky top-0 bg-muted/30 pb-1">
                  <Smile className="h-3 w-3" />
                  Biểu tượng cảm xúc
                </div>
                <div className="space-y-3">
                  {CommentService.getEmojiShortcuts().map((category) => (
                    <div key={category.category}>
                      <div className="text-xs text-muted-foreground mb-1">{category.category}</div>
                      <div className="flex flex-wrap gap-1">
                        {category.emojis.map((emoji) => (
                          <Button
                            key={emoji.shortcut}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-2 text-xs min-w-0 touch-target-lg emoji-button-mobile"
                            onClick={() => insertEmoji(emoji.emoji)}
                            title={`${emoji.name} (${emoji.shortcut})`}
                          >
                            <span className="text-xs truncate">{emoji.emoji} {emoji.shortcut}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  💡 Mẹo: Bạn có thể gõ trực tiếp :) :D &lt;3 :fire: trong bình luận!
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          
          <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-muted-foreground gap-1">
            <span>Tối đa 1000 ký tự</span>
            <span className="font-medium">{formData.content.length}/1000</span>
          </div>
        </div>

        {/* Submit Button - Full width on mobile */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || !formData.userName.trim() || !formData.content.trim()}
            className="w-full sm:w-auto min-h-[48px] text-base font-medium"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Gửi bình luận
              </>
            )}
          </Button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-destructive rounded-full" />
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/50 rounded-md p-3 success-message backdrop-blur-sm">
            <p className="text-sm text-pink-100">
              ✨ Bình luận của bạn đã được gửi thành công!
            </p>
          </div>
        )}
      </form>
      </div>

      <Separator className="my-6" />

      {/* Comments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">
            Bình luận ({comments.length})
          </h4>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Đang tải bình luận...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có bình luận nào cho bộ anime này</p>
            <p className="text-sm">Hãy là người đầu tiên bình luận!</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id} className="p-3 sm:p-4 bg-muted/30 comment-item">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <span className="font-medium text-sm comment-username vietnamese-text">{comment.userName}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {comment.episodeViewing && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Tập {comment.episodeViewing}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {CommentService.formatRelativeTime(comment.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm sm:text-base leading-relaxed comment-content vietnamese-text">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
