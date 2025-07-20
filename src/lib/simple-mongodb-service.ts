// Simplified MongoDB service that avoids client-side issues
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Only run MongoDB code on the server side
const isServer = typeof window === 'undefined';

// MongoDB connection configuration - using environment variables for security
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'anime_streaming';
const MAX_POOL_SIZE = parseInt(process.env.MONGODB_MAX_POOL_SIZE || '25');
const SERVER_SELECTION_TIMEOUT = parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '15000');
const MAX_IDLE_TIME = parseInt(process.env.MONGODB_MAX_IDLE_TIME || '1800000');

// Validate required environment variables at runtime, not build time
function validateEnvironment() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is required. Please check your .env.local file. ' +
      'Expected format: mongodb+srv://username:password@cluster.mongodb.net/'
    );
  }
}

// Interfaces
export interface Comment {
  _id?: string;
  id: string;
  userName: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
}

export interface Admin {
  _id?: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'moderator';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// Mongoose Schemas - only define on server
let CommentModel: any = null;
let AdminModel: any = null;

if (isServer) {
  const commentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userName: { type: String, required: true, maxlength: 100 },
    content: { type: String, required: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: false },
    userAgent: { type: String },
    ipAddress: { type: String, maxlength: 45 },
    episodeViewing: { type: Number }
  }, {
    collection: 'comments'
  });

  const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, maxlength: 50 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'moderator'], default: 'moderator' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true }
  }, {
    collection: 'admins'
  });

  // Create indexes
  commentSchema.index({ timestamp: -1 });
  commentSchema.index({ isApproved: 1 });
  commentSchema.index({ episodeViewing: 1 });
  // Note: username index is automatically created by unique: true

  // Models
  CommentModel = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
  AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
}

export class SimpleMongoDBService {
  private static isConnected = false;
  private static connectionAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5');
  private static readonly RECONNECT_DELAY_BASE = parseInt(process.env.RECONNECT_DELAY_BASE || '1000');
  private static lastConnectionError: Error | null = null;
  private static connectionHealth = {
    status: 'disconnected' as 'connected' | 'connecting' | 'disconnected' | 'error',
    lastCheck: new Date(),
    errorCount: 0,
    successfulConnections: 0,
  };

  // Enhanced connection monitoring
  private static logConnectionStatus(message: string, isError = false) {
    if (process.env.ENABLE_DB_LOGGING === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] MongoDB: ${message}`;
      
      if (isError) {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }

  // Helper method for retrying database operations
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ensure connection is healthy before operation
        if (!this.isConnected || mongoose.connection.readyState !== 1) {
          this.logConnectionStatus(`Reconnecting before ${operationName} (attempt ${attempt + 1})`);
          await this.connect();
        }
        
        const result = await operation();
        
        if (attempt > 0) {
          this.logConnectionStatus(`${operationName} succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.logConnectionStatus(
          `${operationName} attempt ${attempt + 1} failed: ${lastError.message}`,
          true
        );
        
        // Check if this is a connection-related error that we should retry
        const isRetryableError = this.isRetryableError(lastError);
        
        if (!isRetryableError || attempt === maxRetries - 1) {
          // Don't retry non-retryable errors or on last attempt
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = this.calculateBackoffDelay(attempt);
        this.logConnectionStatus(`Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Mark connection as potentially broken
        this.isConnected = false;
      }
    }
    
    throw new Error(
      `${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  // Check if error is retryable
  private static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'MongoServerSelectionError',
      'MongoTimeoutError',
      'MongoNetworkError',
      'MongoWriteConcernError',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'MongoError'
    ];
    
    return retryableErrors.some(errorType => 
      error.name.includes(errorType) || 
      error.message.includes(errorType) ||
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('network')
    );
  }

  // Calculate exponential backoff delay
  private static calculateBackoffDelay(attempt: number): number {
    return Math.min(this.RECONNECT_DELAY_BASE * Math.pow(2, attempt), 30000);
  }

  // Get connection health status
  static getConnectionHealth() {
    return {
      ...this.connectionHealth,
      isConnected: this.isConnected,
      mongooseState: mongoose.connection.readyState,
      mongooseStates: {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
      },
      lastError: this.lastConnectionError?.message,
      connectionAttempts: this.connectionAttempts,
    };
  }

  // Test MongoDB connection with retry logic
  static async testConnection(): Promise<boolean> {
    if (!isServer) return false;
    
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Simple ping test with timeout
      const pingPromise = new Promise<boolean>((resolve) => {
        if (mongoose.connection.readyState === 1) {
          this.connectionHealth.status = 'connected';
          this.connectionHealth.lastCheck = new Date();
          resolve(true);
        } else {
          resolve(false);
        }
      });

      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000);
      });

      const result = await Promise.race([pingPromise, timeoutPromise]);
      
      if (result) {
        this.connectionHealth.errorCount = 0;
        this.connectionHealth.successfulConnections++;
        this.logConnectionStatus('Connection test successful');
      } else {
        this.connectionHealth.errorCount++;
        this.logConnectionStatus('Connection test failed', true);
      }
      
      return result;
    } catch (error) {
      this.connectionHealth.status = 'error';
      this.connectionHealth.errorCount++;
      this.lastConnectionError = error as Error;
      this.logConnectionStatus(`Connection test failed: ${(error as Error).message}`, true);
      return false;
    }
  }

  // Connect to MongoDB with retry logic and enhanced monitoring
  static async connect(): Promise<void> {
    if (!isServer) throw new Error('MongoDB operations are server-side only');
    
    // Validate environment variables at runtime
    validateEnvironment();
    
    // Check if already connected
    if (this.isConnected && mongoose.connection.readyState === 1) {
      this.logConnectionStatus('Already connected to MongoDB');
      return;
    }

    this.connectionHealth.status = 'connecting';
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        this.connectionAttempts++;
        this.logConnectionStatus(`Connection attempt ${attempt + 1}/${this.MAX_RECONNECT_ATTEMPTS}`);

        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(MONGODB_URI + DATABASE_NAME, {
            maxPoolSize: MAX_POOL_SIZE,
            serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
            maxIdleTimeMS: MAX_IDLE_TIME,
            // Additional optimizations for MongoDB Atlas free tier
            retryWrites: true,
            w: 'majority',
            readPreference: 'primary',
            compressors: ['zlib'],
            // Connection monitoring
            heartbeatFrequencyMS: 10000,
          });
        }

        this.isConnected = true;
        this.connectionHealth.status = 'connected';
        this.connectionHealth.successfulConnections++;
        this.connectionHealth.errorCount = 0;
        this.logConnectionStatus(`Connected to MongoDB successfully (attempt ${attempt + 1})`);
        
        // Set up connection event listeners
        this.setupConnectionEventListeners();
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.lastConnectionError = lastError;
        this.connectionHealth.errorCount++;
        this.logConnectionStatus(
          `Connection attempt ${attempt + 1} failed: ${lastError.message}`, 
          true
        );

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.MAX_RECONNECT_ATTEMPTS - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logConnectionStatus(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.connectionHealth.status = 'error';
    this.isConnected = false;
    throw new Error(
      `Failed to connect to MongoDB after ${this.MAX_RECONNECT_ATTEMPTS} attempts. ` +
      `Last error: ${lastError?.message}. ` +
      `Please check your connection string and network connectivity.`
    );
  }

  // Set up connection event listeners for monitoring
  private static setupConnectionEventListeners(): void {
    if (mongoose.connection.listeners('error').length === 0) {
      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        this.connectionHealth.status = 'error';
        this.connectionHealth.errorCount++;
        this.lastConnectionError = error;
        this.logConnectionStatus(`MongoDB connection error: ${error.message}`, true);
      });
    }

    if (mongoose.connection.listeners('disconnected').length === 0) {
      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        this.connectionHealth.status = 'disconnected';
        this.logConnectionStatus('MongoDB disconnected', true);
      });
    }

    if (mongoose.connection.listeners('reconnected').length === 0) {
      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        this.connectionHealth.status = 'connected';
        this.connectionHealth.successfulConnections++;
        this.logConnectionStatus('MongoDB reconnected');
      });
    }
  }

  // Initialize database collections and indexes
  static async initDatabase(): Promise<void> {
    if (!isServer) throw new Error('Database initialization is server-side only');
    
    try {
      await this.connect();

      // Create default admin if none exists
      if (AdminModel) {
        const adminCount = await AdminModel.countDocuments();
        if (adminCount === 0) {
          await this.createDefaultAdmins();
        }
      }

      console.log('MongoDB database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MongoDB database:', error);
      throw error;
    }
  }

  // Create default admin accounts
  static async createDefaultAdmins(): Promise<void> {
    if (!isServer || !AdminModel) return;
    
    const defaultAdmins = [
      {
        username: 'admin',
        password: 'admin123!',
        role: 'admin' as const
      },
      {
        username: 'moderator',
        password: 'mod123!',
        role: 'moderator' as const
      }
    ];

    for (const admin of defaultAdmins) {
      const passwordHash = await bcrypt.hash(admin.password, 12);
      
      await AdminModel.create({
        username: admin.username,
        passwordHash,
        role: admin.role,
        isActive: true
      });
      
      console.log(`Created default ${admin.role}: ${admin.username}`);
    }
  }

  // Comment operations
  static async getComments(): Promise<Comment[]> {
    if (!isServer || !CommentModel) return [];
    
    return this.retryOperation(
      async () => {
        const comments = await CommentModel.find()
          .sort({ timestamp: -1 })
          .lean();
        
        this.logConnectionStatus(`Retrieved ${comments.length} comments successfully`);
        
        return comments.map((comment: any) => ({
          _id: comment._id?.toString(),
          id: comment.id,
          userName: comment.userName,
          content: comment.content,
          timestamp: comment.timestamp,
          isApproved: comment.isApproved,
          userAgent: comment.userAgent,
          ipAddress: comment.ipAddress,
          episodeViewing: comment.episodeViewing
        }));
      },
      'getComments'
    );
  }

  static async addComment(comment: Omit<Comment, '_id'>): Promise<Comment> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
    return this.retryOperation(
      async () => {
        const newComment = new CommentModel(comment);
        const savedComment = await newComment.save();
        
        this.logConnectionStatus(`Comment added successfully: ${savedComment.id}`);
        
        return {
          _id: savedComment._id.toString(),
          id: savedComment.id,
          userName: savedComment.userName,
          content: savedComment.content,
          timestamp: savedComment.timestamp,
          isApproved: savedComment.isApproved,
          userAgent: savedComment.userAgent,
          ipAddress: savedComment.ipAddress,
          episodeViewing: savedComment.episodeViewing
        };
      },
      'addComment'
    );
  }

  static async approveComment(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
    try {
      await this.connect();
      const result = await CommentModel.updateOne(
        { id: commentId },
        { isApproved: true }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to approve comment:', error);
      throw error;
    }
  }

  static async toggleApproval(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
    try {
      await this.connect();
      
      // First get the current approval status
      const comment = await CommentModel.findOne({ id: commentId });
      if (!comment) {
        console.error('Comment not found:', commentId);
        return false;
      }
      
      // Toggle the approval status
      const newApprovalStatus = !comment.isApproved;
      const result = await CommentModel.updateOne(
        { id: commentId },
        { isApproved: newApprovalStatus }
      );
      
      console.log(`Comment ${commentId} approval toggled to: ${newApprovalStatus}`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to toggle comment approval:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
    try {
      await this.connect();
      const result = await CommentModel.deleteOne({ id: commentId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  // Admin operations
  static async validateAdmin(username: string, password: string): Promise<Admin | null> {
    if (!isServer || !AdminModel) return null;
    
    try {
      await this.connect();
      const admin = await AdminModel.findOne({ 
        username: username.toLowerCase(),
        isActive: true 
      });
      
      if (!admin) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await AdminModel.updateOne(
        { _id: admin._id },
        { lastLogin: new Date() }
      );

      return {
        _id: admin._id.toString(),
        username: admin.username,
        passwordHash: admin.passwordHash,
        role: admin.role,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
        isActive: admin.isActive
      };
    } catch (error) {
      console.error('Failed to validate admin:', error);
      throw error;
    }
  }

  // Admin methods
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
    try {
      // Validate admin password first
      const admin = await this.validateAdmin('admin', password);
      if (!admin) {
        return null;
      }

      await this.connect();
      
      // Get all comments (approved and unapproved)
      const comments = await CommentModel.find({})
        .sort({ timestamp: -1 })
        .lean()
        .exec();
      
      // Calculate stats
      const totalComments = comments.length;
      const approvedComments = comments.filter((c: any) => c.isApproved).length;
      const pendingComments = totalComments - approvedComments;
      
      // Calculate comments from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const commentsToday = comments.filter((c: any) => {
        const commentDate = new Date(c.timestamp);
        commentDate.setHours(0, 0, 0, 0);
        return commentDate.getTime() === today.getTime();
      }).length;
      
      const stats = {
        totalComments: totalComments,
        approvedComments: approvedComments,
        pendingComments: pendingComments,
        commentsToday: commentsToday
      };
      
      return {
        comments: comments.map((comment: any) => ({
          id: comment.id,
          userName: comment.userName,
          content: comment.content,
          timestamp: comment.timestamp,
          isApproved: comment.isApproved,
          userAgent: comment.userAgent,
          ipAddress: comment.ipAddress,
          episodeViewing: comment.episodeViewing
        })),
        stats
      };
    } catch (error) {
      console.error('Failed to get admin comments:', error);
      throw error;
    }
  }

  // Migration helper
  static async migrateFromPostgreSQL(postgresComments: any[]): Promise<void> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
    try {
      await this.connect();
      
      console.log(`Starting migration of ${postgresComments.length} comments from PostgreSQL to MongoDB`);
      
      for (const pgComment of postgresComments) {
        const mongoComment = {
          id: pgComment.id,
          userName: pgComment.user_name || pgComment.userName,
          content: pgComment.content,
          timestamp: new Date(pgComment.timestamp),
          isApproved: pgComment.is_approved || pgComment.isApproved,
          userAgent: pgComment.user_agent || pgComment.userAgent || '',
          ipAddress: pgComment.ip_address || pgComment.ipAddress || '',
          episodeViewing: pgComment.episode_viewing || pgComment.episodeViewing
        };

        // Check if comment already exists
        const existingComment = await CommentModel.findOne({ id: mongoComment.id });
        if (!existingComment) {
          await CommentModel.create(mongoComment);
          console.log(`Migrated comment: ${mongoComment.id}`);
        } else {
          console.log(`Comment already exists: ${mongoComment.id}`);
        }
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Close connections
  static async disconnect(): Promise<void> {
    if (!isServer) return;
    
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}
