import { DatabaseService } from './database-service'; // PostgreSQL
import { SimpleMongoDBService } from './simple-mongodb-service'; // MongoDB

// Configuration to switch between databases
// Use MongoDB for localhost development, PostgreSQL for production
const USE_MONGODB = process.env.NODE_ENV === 'development' || process.env.USE_MONGODB === 'true';

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
  // Use the configured database service
  private static get dbService() {
    return USE_MONGODB ? SimpleMongoDBService : DatabaseService;
  }

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
      /(.)\1{10,}/i, // Repeated characters
      /https?:\/\/[^\s]+/i, // URLs
      /\b(spam|scam|fake|bot)\b/i, // Common spam words
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        errors.push('Nội dung có thể là spam hoặc không phù hợp');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static processEmojis(text: string): string {
    const emojiMap: { [key: string]: string } = {
      ':)': '😊',
      ':D': '😃',
      ':(': '😢',
      ':P': '😛',
      ';)': '😉',
      ':o': '😮',
      ':*': '😘',
      '<3': '❤️',
      '</3': '💔',
      ':thumbsup:': '👍',
      ':thumbsdown:': '👎',
      ':clap:': '👏',
      ':fire:': '🔥',
      ':star:': '⭐',
      ':laugh:': '😂',
      ':cry:': '😭',
      ':angry:': '😠',
      ':love: ' : '😍',
      ':cool:': '😎'
    };

    let processedText = text;
    for (const [shortcode, emoji] of Object.entries(emojiMap)) {
      const regex = new RegExp(shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      processedText = processedText.replace(regex, emoji);
    }

    return processedText;
  }

  // Get all comments
  static async getComments(): Promise<Comment[]> {
    try {
      if (USE_MONGODB) {
        return await SimpleMongoDBService.getComments();
      } else {
        return await DatabaseService.getAllComments();
      }
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
        isApproved: true, // Auto-approve comments for development
        userAgent: commentData.userAgent || '',
        ipAddress: commentData.ipAddress || '',
        episodeViewing: commentData.episodeViewing
      };

      if (USE_MONGODB) {
        return await SimpleMongoDBService.addComment(comment);
      } else {
        const result = await DatabaseService.addComment(comment);
        if (!result) {
          throw new Error('Failed to save comment to database');
        }
        return result;
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  // Admin functions
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    try {
      if (USE_MONGODB) {
        return await SimpleMongoDBService.getAllCommentsAdmin(password);
      } else {
        return await DatabaseService.getAllCommentsAdmin(password);
      }
    } catch (error) {
      console.error('Failed to get admin comments:', error);
      throw error;
    }
  }

  static async toggleApproval(commentId: string, password?: string): Promise<boolean> {
    try {
      if (USE_MONGODB) {
        // For MongoDB, validate admin password if provided
        if (password) {
          const admin = await SimpleMongoDBService.validateAdmin('admin', password);
          if (!admin) return false;
        }
        
        return await SimpleMongoDBService.toggleApproval(commentId);
      } else {
        // For PostgreSQL, just toggle approval (password validation happens elsewhere)
        return await DatabaseService.toggleApproval(commentId);
      }
    } catch (error) {
      console.error('Failed to toggle approval:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string, password?: string): Promise<boolean> {
    try {
      if (USE_MONGODB) {
        // For MongoDB, validate admin password if provided
        if (password) {
          const admin = await SimpleMongoDBService.validateAdmin('admin', password);
          if (!admin) return false;
        }
        
        return await SimpleMongoDBService.deleteComment(commentId);
      } else {
        // For PostgreSQL, just delete comment (password validation happens elsewhere)
        return await DatabaseService.deleteComment(commentId);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  // Admin authentication
  static async validateAdmin(username: string, password: string): Promise<any> {
    try {
      if (USE_MONGODB) {
        return await SimpleMongoDBService.validateAdmin(username, password);
      } else {
        // For PostgreSQL, use the old admin password system
        const validPassword = process.env.ADMIN_PASSWORD || '826264';
        if (password === validPassword) {
          return {
            username: 'admin',
            role: 'admin',
            isValid: true
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Failed to validate admin:', error);
      throw error;
    }
  }

  // Validate admin password (client-side basic validation)
  static validateAdminPassword(password: string): boolean {
    return password.length >= 6;
  }

  // Get database type for debugging
  static getDatabaseType(): string {
    return USE_MONGODB ? 'MongoDB' : 'PostgreSQL';
  }

  // Switch database (for testing/migration)
  static switchToMongoDB(): void {
    // This would require environment variable change and restart
    console.log('To switch to MongoDB, set USE_MONGODB=true in environment variables and restart the server');
  }
}
