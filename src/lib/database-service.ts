import { sql } from '@vercel/postgres';

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

export class DatabaseService {
  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Initialize database table
  static async initDatabase() {
    try {
      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed. Check POSTGRES_URL environment variable.');
      }

      await sql`
        CREATE TABLE IF NOT EXISTS comments (
          id VARCHAR(36) PRIMARY KEY,
          user_name VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_approved BOOLEAN DEFAULT FALSE,
          user_agent TEXT,
          ip_address VARCHAR(45),
          episode_viewing INTEGER
        )
      `;
      
      // Create index for performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments(timestamp DESC)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(is_approved)
      `;
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Get all approved comments
  static async getApprovedComments(): Promise<Comment[]> {
    try {
      const result = await sql`
        SELECT * FROM comments 
        WHERE is_approved = true 
        ORDER BY timestamp DESC
      `;
      
      return result.rows.map(row => ({
        id: row.id,
        userName: row.user_name,
        content: row.content,
        timestamp: new Date(row.timestamp),
        isApproved: row.is_approved,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        episodeViewing: row.episode_viewing
      }));
    } catch (error) {
      console.error('Error getting approved comments:', error);
      return [];
    }
  }

  // Get all comments (admin)
  static async getAllComments(): Promise<Comment[]> {
    try {
      const result = await sql`
        SELECT * FROM comments 
        ORDER BY timestamp DESC
      `;
      
      return result.rows.map(row => ({
        id: row.id,
        userName: row.user_name,
        content: row.content,
        timestamp: new Date(row.timestamp),
        isApproved: row.is_approved,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        episodeViewing: row.episode_viewing
      }));
    } catch (error) {
      console.error('Error getting all comments:', error);
      return [];
    }
  }

  // Add new comment
  static async addComment(comment: Omit<Comment, 'timestamp'>): Promise<Comment | null> {
    try {
      const result = await sql`
        INSERT INTO comments (
          id, user_name, content, is_approved, user_agent, ip_address, episode_viewing
        ) VALUES (
          ${comment.id}, ${comment.userName}, ${comment.content}, 
          ${comment.isApproved}, ${comment.userAgent}, ${comment.ipAddress}, 
          ${comment.episodeViewing || null}
        )
        RETURNING *
      `;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userName: row.user_name,
        content: row.content,
        timestamp: new Date(row.timestamp),
        isApproved: row.is_approved,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        episodeViewing: row.episode_viewing
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  // Toggle comment approval
  static async toggleApproval(commentId: string): Promise<boolean> {
    try {
      console.log('Toggling approval for comment ID:', commentId);
      
      // First, get current status
      const currentResult = await sql`
        SELECT id, is_approved FROM comments WHERE id = ${commentId}
      `;
      
      if (currentResult.rows.length === 0) {
        console.error('Comment not found:', commentId);
        return false;
      }
      
      const currentStatus = currentResult.rows[0].is_approved;
      console.log('Current approval status:', currentStatus);
      
      // Toggle the approval
      const updateResult = await sql`
        UPDATE comments 
        SET is_approved = NOT is_approved 
        WHERE id = ${commentId}
        RETURNING id, is_approved
      `;
      
      if (updateResult.rows.length > 0) {
        const newStatus = updateResult.rows[0].is_approved;
        console.log('New approval status:', newStatus);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error toggling approval:', error);
      return false;
    }
  }

  // Delete comment
  static async deleteComment(commentId: string): Promise<boolean> {
    try {
      await sql`
        DELETE FROM comments 
        WHERE id = ${commentId}
      `;
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Get statistics
  static async getStats() {
    try {
      const totalResult = await sql`SELECT COUNT(*) as count FROM comments`;
      const approvedResult = await sql`SELECT COUNT(*) as count FROM comments WHERE is_approved = true`;
      const todayResult = await sql`
        SELECT COUNT(*) as count FROM comments 
        WHERE DATE(timestamp) = CURRENT_DATE
      `;
      
      const totalComments = parseInt(totalResult.rows[0].count);
      const approvedComments = parseInt(approvedResult.rows[0].count);
      const commentsToday = parseInt(todayResult.rows[0].count);
      
      return {
        totalComments,
        approvedComments,
        pendingComments: totalComments - approvedComments,
        commentsToday
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalComments: 0,
        approvedComments: 0,
        pendingComments: 0,
        commentsToday: 0
      };
    }
  }
}
