import { SimpleMongoDBService } from './simple-mongodb-service'; // MongoDB

export interface Comment {
  id: string;
  userName: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CommentService {
  static validateComment(userName: string, content: string): ValidationResult {
    const errors: string[] = [];

    // Username validation
    if (!userName || userName.trim().length === 0) {
      errors.push('Tên không được để trống');
    } else if (userName.trim().length > 100) {
      errors.push('Tên quá dài (tối đa 100 ký tự)');
    } else if (!/^[a-zA-Z0-9\s\u00C0-\u017F\u1EA0-\u1EF9]+$/.test(userName.trim())) {
      errors.push('Tên chỉ được chứa chữ cái, số và khoảng trắng');
    }

    // Content validation
    if (!content || content.trim().length === 0) {
      errors.push('Nội dung không được để trống');
    } else if (content.trim().length > 1000) {
      errors.push('Nội dung quá dài (tối đa 1000 ký tự)');
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters
      /https?:\/\//g, // URLs
      /[^\w\s\u00C0-\u017F\u1EA0-\u1EF9]/g // Special characters (excluding Vietnamese)
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        errors.push('Nội dung chứa ký tự không hợp lệ hoặc spam');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Emoji processing helper
  static processEmojis(content: string): string {
    // Simple emoji mapping
    const emojiMap: { [key: string]: string } = {
      ':)': '😊',
      ':D': '😃',
      ':(': '😢',
      ':P': '😛',
      ':o': '😮',
      '<3': '❤️',
      ':heart:': '❤️',
      ':laugh:': '😂',
      ':cry:': '😭',
      ':love:': '😍'
    };

    let processed = content;
    for (const [text, emoji] of Object.entries(emojiMap)) {
      processed = processed.replace(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), emoji);
    }

    return processed;
  }

  // Get all approved comments
  static async getComments(): Promise<Comment[]> {
    try {
      const allComments = await SimpleMongoDBService.getComments();
      return allComments.filter(comment => comment.isApproved);
    } catch (error) {
      console.error('Failed to get comments:', error);
      throw error;
    }
  }

  // Add a new comment
  static async addComment(commentData: {
    userName: string;
    content: string;
    userAgent?: string;
    ipAddress?: string;
    episodeViewing?: number;
  }): Promise<Comment> {
    try {
      // Validate the comment
      const validation = this.validateComment(commentData.userName, commentData.content);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Process content
      const processedContent = this.processEmojis(commentData.content.trim());

      // Create comment object
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userName: commentData.userName.trim(),
        content: processedContent,
        timestamp: new Date(),
        isApproved: true, // Auto-approve comments
        userAgent: commentData.userAgent || '',
        ipAddress: commentData.ipAddress || '',
        episodeViewing: commentData.episodeViewing
      };

      return await SimpleMongoDBService.addComment(comment);
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  // Admin functions
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    try {
      return await SimpleMongoDBService.getAllCommentsAdmin(password);
    } catch (error) {
      console.error('Failed to get admin comments:', error);
      throw error;
    }
  }

  static async toggleApproval(commentId: string, password?: string): Promise<boolean> {
    try {
      // For MongoDB, validate admin password if provided
      if (password) {
        const admin = await SimpleMongoDBService.validateAdmin('admin', password);
        if (!admin) return false;
      }
      
      return await SimpleMongoDBService.toggleApproval(commentId);
    } catch (error) {
      console.error('Failed to toggle approval:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string, password?: string): Promise<boolean> {
    try {
      // For MongoDB, validate admin password if provided
      if (password) {
        const admin = await SimpleMongoDBService.validateAdmin('admin', password);
        if (!admin) return false;
      }
      
      return await SimpleMongoDBService.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  // Admin authentication
  static async validateAdmin(username: string, password: string): Promise<any> {
    try {
      return await SimpleMongoDBService.validateAdmin(username, password);
    } catch (error) {
      console.error('Failed to validate admin:', error);
      throw error;
    }
  }

  // Database type (always MongoDB now)
  static getDatabaseType(): string {
    return 'MongoDB';
  }
}
