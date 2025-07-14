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

      // Create admin table for storing admin credentials
      await sql`
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE
        )
      `;

      // Create index for admin username lookup
      await sql`
        CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username)
      `;

      // Initialize default admin if none exists
      await this.initializeDefaultAdmin();
      
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

  // Get all comments with admin authentication and stats
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    try {
      // Validate admin password (using simple password check for compatibility)
      const validPassword = process.env.ADMIN_PASSWORD || '826264';
      if (password !== validPassword) {
        return null;
      }

      const result = await sql`
        SELECT * FROM comments 
        ORDER BY timestamp DESC
      `;
      
      const comments = result.rows.map(row => ({
        id: row.id,
        userName: row.user_name,
        content: row.content,
        timestamp: new Date(row.timestamp),
        isApproved: row.is_approved,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        episodeViewing: row.episode_viewing
      }));

      // Calculate stats
      const totalComments = comments.length;
      const approvedComments = comments.filter(c => c.isApproved).length;
      const pendingComments = totalComments - approvedComments;
      
      const stats = {
        total: totalComments,
        approved: approvedComments,
        pending: pendingComments
      };
      
      return { comments, stats };
    } catch (error) {
      console.error('Error getting admin comments:', error);
      return null;
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

  // Initialize default admin account
  static async initializeDefaultAdmin() {
    try {
      // Check if any admin exists
      const existingAdmins = await sql`SELECT COUNT(*) as count FROM admins`;
      const adminCount = parseInt(existingAdmins.rows[0].count);

      if (adminCount === 0) {
        console.log('No admin found, creating default admin...');
        
        // Create default admin with password "826264"
        const defaultPassword = '826264';
        const passwordHash = await this.hashPassword(defaultPassword);
        
        await sql`
          INSERT INTO admins (username, password_hash) 
          VALUES ('admin', ${passwordHash})
        `;
        
        console.log('✅ Default admin created: username="admin", password="826264"');
      }
    } catch (error) {
      console.error('Error initializing default admin:', error);
    }
  }

  // Simple password hashing (compatible with both browser and Node.js)
  static async hashPassword(password: string): Promise<string> {
    const salt = 'anime_comment_salt_2025';
    const combined = salt + password + salt;
    
    // Use Web Crypto API if available (browser), otherwise use a simple hash
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(combined);
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.warn('Web Crypto API failed, falling back to simple hash');
      }
    }
    
    // Fallback: simple hash using string manipulation
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + combined.length.toString(16);
  }

  // Verify admin password
  static async verifyAdminPassword(username: string, password: string): Promise<boolean> {
    try {
      const result = await sql`
        SELECT password_hash, is_active FROM admins 
        WHERE username = ${username} AND is_active = true
      `;

      if (result.rows.length === 0) {
        return false;
      }

      const storedHash = result.rows[0].password_hash;
      const inputHash = await this.hashPassword(password);
      
      const isValid = storedHash === inputHash;
      
      if (isValid) {
        // Update last login time
        await sql`
          UPDATE admins 
          SET last_login = NOW() 
          WHERE username = ${username}
        `;
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying admin password:', error);
      return false;
    }
  }

  // Change admin password
  static async changeAdminPassword(username: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Verify current password first
      const isCurrentValid = await this.verifyAdminPassword(username, currentPassword);
      if (!isCurrentValid) {
        return false;
      }

      // Hash new password and update
      const newPasswordHash = await this.hashPassword(newPassword);
      await sql`
        UPDATE admins 
        SET password_hash = ${newPasswordHash} 
        WHERE username = ${username}
      `;

      console.log(`Admin password changed for: ${username}`);
      return true;
    } catch (error) {
      console.error('Error changing admin password:', error);
      return false;
    }
  }
}
