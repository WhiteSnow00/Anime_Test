"use client";

import { Comment, CommentFormData } from '@/types/comment';

export class CommentService {
  // Get all approved comments from API
  static async getComments(): Promise<Comment[]> {
    try {
      const response = await fetch('/api/comments', {
        method: 'GET',
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Convert timestamp strings back to Date objects
        return data.comments.map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error loading comments:', error);
      return [];
    }
  }

  // Add new comment via API
  static async addComment(formData: CommentFormData): Promise<Comment | null> {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: formData.userName.trim(),
          content: this.processEmojis(formData.content.trim()),
          episodeViewing: formData.episodeViewing
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          ...data.comment,
          timestamp: new Date(data.comment.timestamp)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  // Get all comments for admin (including unapproved)
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    try {
      const response = await fetch(`/api/comments/admin?password=${encodeURIComponent(password)}`, {
        method: 'GET',
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          comments: data.comments.map((comment: any) => ({
            ...comment,
            timestamp: new Date(comment.timestamp)
          })),
          stats: data.stats
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error loading admin comments:', error);
      return null;
    }
  }

  // Toggle comment approval via API
  static async toggleApproval(commentId: string, password: string): Promise<boolean> {
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

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error toggling approval:', error);
      return false;
    }
  }

  // Delete comment via API
  static async deleteComment(commentId: string, password: string): Promise<boolean> {
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

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Validate admin password (server-side validation only)
  static validateAdminPassword(password: string): boolean {
    // Client-side validation removed for security
    // Real validation happens server-side only
    return password.length >= 6;
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
    } else {
      const content = formData.content.trim();
      
      // Check if content contains only emojis or emoji shortcuts
      const processedContent = this.processEmojis(content);
      const emojiOnlyRegex = /^[\p{Emoji_Presentation}\p{Emoji}\s]+$/u;
      const isEmojiOnly = emojiOnlyRegex.test(processedContent) || 
                         this.containsOnlyEmojiShortcuts(content);
      
      // For emoji-only comments, skip minimum length validation
      if (!isEmojiOnly && content.length < 3) {
        errors.push('Bình luận phải có ít nhất 3 ký tự');
      } else if (content.length > 1000) {
        errors.push('Bình luận không được quá 1000 ký tự');
      }
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /\b(?:spam|bot|fake)\b/gi, // Spam keywords
    ];

    const content = formData.content.toLowerCase();
    if (spamPatterns.some(pattern => pattern.test(content))) {
      errors.push('Nội dung có vẻ như spam, vui lòng thử lại');
    }

    return errors;
  }

  // Check if content contains only emoji shortcuts
  static containsOnlyEmojiShortcuts(text: string): boolean {
    const emojiShortcuts = [
      '<3', '</3', ':)', ':D', ':(', ':o', ';)', '<(")',
      ':heart:', ':love:', ':happy:', ':smile:', ':laugh:', ':joy:',
      ':sad:', ':cry:', ':surprised:', ':angry:', ':mad:', ':cool:',
      ':wink:', ':kawaii:', ':cute:', ':anime:', ':manga:', ':otaku:',
      ':thumbsup:', ':thumbsdown:', ':like:', ':dislike:', ':vietnam:',
      ':vn:', ':fire:', ':star:', ':sparkle:', ':100:', ':clap:',
      ':pray:', ':think:', ':wow:', ':penguin:', ':cat:', ':dog:',
      ':bear:', ':panda:', ':tiger:', ':fox:', ':rabbit:', ':frog:',
      ':pizza:', ':burger:', ':sushi:', ':ramen:', ':coffee:', ':tea:',
      ':beer:', ':cake:', ':cookie:', ':game:', ':controller:',
      ':computer:', ':phone:', ':tv:', ':headphones:', ':sun:',
      ':moon:', ':cloud:', ':rain:', ':snow:', ':flower:', ':tree:',
      ':rainbow:', ':party:', ':birthday:', ':gift:', ':balloon:',
      ':trophy:', ':medal:', ':rocket:', ':magic:', ':diamond:',
      ':crown:', ':money:', ':bomb:', ':ghost:', ':alien:', ':robot:'
    ];
    
    // Remove all emoji shortcuts and whitespace, see if anything remains
    let cleanText = text;
    emojiShortcuts.forEach(shortcut => {
      const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanText = cleanText.replace(regex, '');
    });
    
    // If only whitespace remains, it was emoji shortcuts only
    return cleanText.trim().length === 0;
  }

  // Convert text shortcuts to emojis
  static processEmojis(text: string): string {
    const emojiMap: Record<string, string> = {
      '<3': '❤️',
      '</3': '💔',
      ':heart:': '❤️',
      ':love:': '💕',
      
      ':)': '😊',
      ':-)': '😊',
      ':D': '😃',
      ':-D': '😃',
      ':happy:': '😊',
      ':smile:': '😊',
      ':laugh:': '😂',
      ':joy:': '😂',
      
      ':(':  '😢',
      ':-(':  '😢',
      ':sad:': '😢',
      ':cry:': '😭',

      ':o': '😮',
      ':-o': '😮',
      ':surprised:': '😮',
      ':angry:': '😠',
      ':mad:': '😡',
      ':cool:': '😎',
      ':wink:': '😉',
      ';)': '😉',
      ';-)': '😉',
      
      ':kawaii:': '🥰',
      ':cute:': '🥰',
      ':anime:': '🎌',
      ':manga:': '📚',
      ':otaku:': '🤓',
      
      ':thumbsup:': '👍',
      ':thumbsdown:': '👎',
      ':like:': '👍',
      ':dislike:': '👎',

      ':vietnam:': '🇻🇳',
      ':vn:': '🇻🇳',
      
      ':fire:': '🔥',
      ':star:': '⭐',
      ':sparkle:': '✨',
      ':100:': '💯',
      ':clap:': '👏',
      ':pray:': '🙏',
      ':think:': '🤔',
      ':wow:': '😱',

      '<(")': '🐧', 
      ':penguin:': '🐧',
      ':cat:': '🐱',
      ':dog:': '🐶',
      ':bear:': '🐻',
      ':panda:': '🐼',
      ':tiger:': '🐯',
      ':fox:': '🦊',
      ':rabbit:': '🐰',
      ':frog:': '🐸',
    };

    let processedText = text;
    
    // Replace emoji shortcuts
    Object.entries(emojiMap).forEach(([shortcut, emoji]) => {
      const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      processedText = processedText.replace(regex, emoji);
    });

    return processedText;
  }

  // Get available emoji shortcuts for UI help
  static getEmojiShortcuts(): Array<{category: string, emojis: Array<{shortcut: string, emoji: string, name: string}>}> {
    return [
      {
        category: 'Cảm xúc cơ bản',
        emojis: [
          { shortcut: ':)', emoji: '😊', name: 'Vui vẻ' },
          { shortcut: ':D', emoji: '😃', name: 'Cười to' },
          { shortcut: ':(', emoji: '😢', name: 'Buồn' },
          { shortcut: ':o', emoji: '😮', name: 'Ngạc nhiên' },
          { shortcut: ';)', emoji: '😉', name: 'Nháy mắt' },
          { shortcut: ':cool:', emoji: '😎', name: 'Ngầu' }
        ]
      },
      {
        category: 'Yêu thích',
        emojis: [
          { shortcut: '<3', emoji: '❤️', name: 'Yêu' },
          { shortcut: ':kawaii:', emoji: '🥰', name: 'Dễ thương' },
          { shortcut: ':fire:', emoji: '🔥', name: 'Xuất sắc' },
          { shortcut: ':star:', emoji: '⭐', name: 'Tuyệt vời' },
          { shortcut: ':100:', emoji: '💯', name: 'Hoàn hảo' },
          { shortcut: ':clap:', emoji: '👏', name: 'Vỗ tay' }
        ]
      },
      {
        category: 'Anime/Manga',
        emojis: [
          { shortcut: ':anime:', emoji: '🎌', name: 'Anime' },
          { shortcut: ':manga:', emoji: '📚', name: 'Manga' },
          { shortcut: ':otaku:', emoji: '🤓', name: 'Otaku' },
          { shortcut: ':vn:', emoji: '🇻🇳', name: 'Việt Nam' }
        ]
      },
      {
        category: 'Động vật',
        emojis: [
          { shortcut: '<(")', emoji: '🐧', name: 'Chim cánh cụt' },
          { shortcut: ':penguin:', emoji: '🐧', name: 'Chim cánh cụt' },
          { shortcut: ':cat:', emoji: '🐱', name: 'Mèo' },
          { shortcut: ':dog:', emoji: '🐶', name: 'Chó' },
          { shortcut: ':panda:', emoji: '🐼', name: 'Gấu trúc' },
          { shortcut: ':fox:', emoji: '🦊', name: 'Cáo' },
          { shortcut: ':rabbit:', emoji: '🐰', name: 'Thỏ' }
        ]
      },
      {
        category: 'Đồ ăn thức uống',
        emojis: [
          { shortcut: ':pizza:', emoji: '🍕', name: 'Pizza' },
          { shortcut: ':sushi:', emoji: '🍣', name: 'Sushi' },
          { shortcut: ':ramen:', emoji: '🍜', name: 'Ramen' },
          { shortcut: ':coffee:', emoji: '☕', name: 'Cà phê' },
          { shortcut: ':cake:', emoji: '🎂', name: 'Bánh kem' },
          { shortcut: ':cookie:', emoji: '🍪', name: 'Bánh quy' }
        ]
      },
      {
        category: 'Gaming & Tech',
        emojis: [
          { shortcut: ':game:', emoji: '🎮', name: 'Game' },
          { shortcut: ':computer:', emoji: '💻', name: 'Máy tính' },
          { shortcut: ':phone:', emoji: '📱', name: 'Điện thoại' },
          { shortcut: ':headphones:', emoji: '🎧', name: 'Tai nghe' },
          { shortcut: ':tv:', emoji: '📺', name: 'TV' },
          { shortcut: ':rocket:', emoji: '🚀', name: 'Tên lửa' }
        ]
      },
      {
        category: 'Phản ứng',
        emojis: [
          { shortcut: ':thumbsup:', emoji: '👍', name: 'Thích' },
          { shortcut: ':wow:', emoji: '😱', name: 'Wow' },
          { shortcut: ':think:', emoji: '🤔', name: 'Suy nghĩ' },
          { shortcut: ':pray:', emoji: '🙏', name: 'Cầu nguyện' },
          { shortcut: ':party:', emoji: '🎉', name: 'Tiệc tung' },
          { shortcut: ':trophy:', emoji: '🏆', name: 'Cúp vàng' }
        ]
      }
    ];
  }
}
