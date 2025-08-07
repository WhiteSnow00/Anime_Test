import mongoose from 'mongoose';
import { SimpleMongoDBService } from './simple-mongodb-service';
import { CommentLike, CommentReply, ExtendedComment } from '@/types/comment-extended';
import { v4 as uuidv4 } from 'uuid';

const isServer = typeof window === 'undefined';

let CommentLikeModel: any = null;
let CommentReplyModel: any = null;
let CommentModel: any = null;

if (isServer) {
  const commentLikeSchema = new mongoose.Schema({
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    ipAddress: { type: String, required: true, maxlength: 45 },
    timestamp: { type: Date, default: Date.now },
    userAgent: { type: String }
  }, {
    collection: 'comment_likes'
  });

  const commentReplySchema = new mongoose.Schema({
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
    id: { type: String, required: true, unique: true },
    userName: { type: String, required: true, maxlength: 100 },
    displayName: { type: String, maxlength: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    content: { type: String, required: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: true },
    userAgent: { type: String },
    ipAddress: { type: String, maxlength: 45 },
    episodeViewing: { type: Number },
    likeCount: { type: Number, default: 0 }
  }, {
    collection: 'comment_replies'
  });

  commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true, sparse: true });
  commentLikeSchema.index({ commentId: 1, ipAddress: 1 });
  commentLikeSchema.index({ timestamp: -1 });
  commentReplySchema.index({ parentCommentId: 1 });
  commentReplySchema.index({ timestamp: -1 });
  commentReplySchema.index({ isApproved: 1 });
  commentReplySchema.index({ userId: 1 });

  CommentLikeModel = mongoose.models.CommentLike || mongoose.model('CommentLike', commentLikeSchema);
  CommentReplyModel = mongoose.models.CommentReply || mongoose.model('CommentReply', commentReplySchema);
}

let UserModel: any = null;
if (isServer) {
  UserModel = mongoose.models.User;
  CommentModel = mongoose.models.Comment;
}

export class MongoDBExtendedService extends SimpleMongoDBService {
  
  static async toggleCommentLike(
    commentId: string, 
    userId?: string, 
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; likeCount: number; userLiked: boolean }> {
    if (!isServer || !CommentLikeModel) {
      throw new Error('Server-side only operation');
    }

    try {
      await this.connect();

      const existingLike = userId
        ? await CommentLikeModel.findOne({ commentId, userId })
        : await CommentLikeModel.findOne({ commentId, ipAddress });

      if (existingLike) {
        await CommentLikeModel.deleteOne({ _id: existingLike._id });
        
        const likeCount = await CommentLikeModel.countDocuments({ commentId });
        
        return {
          success: true,
          likeCount,
          userLiked: false
        };
      } else {
        const newLike = new CommentLikeModel({
          commentId,
          userId: userId || undefined,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          timestamp: new Date()
        });
        
        await newLike.save();
        
        const likeCount = await CommentLikeModel.countDocuments({ commentId });
        
        return {
          success: true,
          likeCount,
          userLiked: true
        };
      }
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
      throw error;
    }
  }

  static async getCommentLikeStatus(
    commentId: string,
    userId?: string,
    ipAddress?: string
  ): Promise<{ likeCount: number; userLiked: boolean }> {
    if (!isServer || !CommentLikeModel) {
      return { likeCount: 0, userLiked: false };
    }

    try {
      await this.connect();

      const likeCount = await CommentLikeModel.countDocuments({ commentId });
      
      let userLiked = false;
      if (userId || ipAddress) {
        const userLike = userId
          ? await CommentLikeModel.findOne({ commentId, userId })
          : await CommentLikeModel.findOne({ commentId, ipAddress });
        
        userLiked = !!userLike;
      }

      return { likeCount, userLiked };
    } catch (error) {
      console.error('Failed to get comment like status:', error);
      return { likeCount: 0, userLiked: false };
    }
  }

  static async addCommentReply(
    parentCommentId: string,
    reply: {
      userName: string;
      displayName?: string;
      userId?: string;
      content: string;
      userAgent: string;
      ipAddress: string;
      episodeViewing?: number;
    }
  ): Promise<CommentReply> {
    if (!isServer || !CommentReplyModel) {
      throw new Error('Server-side only operation');
    }

    try {
      await this.connect();

      const newReply = new CommentReplyModel({
        parentCommentId,
        id: uuidv4(),
        userName: reply.userName,
        displayName: reply.displayName,
        userId: reply.userId,
        content: reply.content,
        timestamp: new Date(),
        isApproved: true,
        userAgent: reply.userAgent,
        ipAddress: reply.ipAddress,
        episodeViewing: reply.episodeViewing,
        likeCount: 0
      });

      const savedReply = await newReply.save();

      return {
        _id: savedReply._id.toString(),
        parentCommentId: savedReply.parentCommentId.toString(),
        id: savedReply.id,
        userName: savedReply.userName,
        displayName: savedReply.displayName,
        userId: savedReply.userId?.toString(),
        content: savedReply.content,
        timestamp: savedReply.timestamp,
        isApproved: savedReply.isApproved,
        userAgent: savedReply.userAgent,
        ipAddress: savedReply.ipAddress,
        episodeViewing: savedReply.episodeViewing,
        likes: [],
        likeCount: 0
      };
    } catch (error) {
      console.error('Failed to add comment reply:', error);
      throw error;
    }
  }

  static async getCommentReplies(
    commentId: string,
    includeUnapproved: boolean = false
  ): Promise<CommentReply[]> {
    if (!isServer || !CommentReplyModel) {
      return [];
    }

    try {
      await this.connect();

      const query = includeUnapproved 
        ? { parentCommentId: commentId }
        : { parentCommentId: commentId, isApproved: true };

      const replies = await CommentReplyModel.find(query)
        .sort({ timestamp: 1 })
        .lean();

      const repliesWithLikes = await Promise.all(
        replies.map(async (reply: any) => {
          const likeCount = await CommentLikeModel.countDocuments({ 
            commentId: reply._id 
          });

          return {
            _id: reply._id.toString(),
            parentCommentId: reply.parentCommentId.toString(),
            id: reply.id,
            userName: reply.userName,
            displayName: reply.displayName,
            userId: reply.userId?.toString(),
            content: reply.content,
            timestamp: reply.timestamp,
            isApproved: reply.isApproved,
            userAgent: reply.userAgent,
            ipAddress: reply.ipAddress,
            episodeViewing: reply.episodeViewing,
            likes: [],
            likeCount
          };
        })
      );

      return repliesWithLikes;
    } catch (error) {
      console.error('Failed to get comment replies:', error);
      return [];
    }
  }

  static async getCommentById(commentId: string): Promise<any> {
    if (!isServer) {
      return null;
    }

    try {
      await this.connect();

      const comment = await CommentModel.findById(commentId).lean();
      if (comment) {
        return {
          _id: comment._id.toString(),
          userName: comment.userName,
          displayName: comment.displayName,
          userId: comment.userId?.toString(),
          content: comment.content,
          timestamp: comment.timestamp,
          isApproved: comment.isApproved,
          userAgent: comment.userAgent,
          ipAddress: comment.ipAddress,
          episodeViewing: comment.episodeViewing
        };
      }

      const reply = await CommentReplyModel.findById(commentId).lean();
      if (reply) {
        return {
          _id: reply._id.toString(),
          parentCommentId: reply.parentCommentId.toString(),
          userName: reply.userName,
          displayName: reply.displayName,
          userId: reply.userId?.toString(),
          content: reply.content,
          timestamp: reply.timestamp,
          isApproved: reply.isApproved,
          userAgent: reply.userAgent,
          ipAddress: reply.ipAddress
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get comment by ID:', error);
      return null;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    if (!isServer) {
      return false;
    }

    try {
      await this.connect();

      const commentResult = await CommentModel.findByIdAndDelete(commentId);
      
      if (commentResult) {
        await CommentReplyModel.deleteMany({ parentCommentId: commentId });
        await CommentLikeModel.deleteMany({ commentId: commentId });
        return true;
      }

      const replyResult = await CommentReplyModel.findByIdAndDelete(commentId);
      if (replyResult) {
        await CommentLikeModel.deleteMany({ commentId: commentId });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    }
  }

  static async getCommentsWithInteractions(
    episodeId?: number
  ): Promise<ExtendedComment[]> {
    if (!isServer) {
      return [];
    }

    try {
      await this.connect();
      const comments = await this.getComments();
      const filteredComments = episodeId
        ? comments.filter(c => c.episodeViewing === episodeId)
        : comments;
      const enhancedComments = await Promise.all(
        filteredComments.map(async (comment) => {
          const likeCount = await CommentLikeModel.countDocuments({
            commentId: comment._id 
          });
          const replyCount = await CommentReplyModel.countDocuments({
            parentCommentId: comment._id,
            isApproved: true
          });
          const replies = await this.getCommentReplies(comment._id!, false);
          return {
            ...comment,
            likes: [],
            likeCount,
            replies: replies.slice(0, 5),
            replyCount
          } as ExtendedComment;
        })
      );

      return enhancedComments;
    } catch (error) {
      console.error('Failed to get comments with interactions:', error);
      return [];
    }
  }

  static async toggleReplyLike(
    replyId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; likeCount: number; userLiked: boolean }> {
    return this.toggleCommentLike(replyId, userId, ipAddress, userAgent);
  }

  static async deleteReply(replyId: string): Promise<boolean> {
    if (!isServer || !CommentReplyModel) {
      return false;
    }

    try {
      await this.connect();
      const result = await CommentReplyModel.deleteOne({ _id: replyId });
      
      await CommentLikeModel.deleteMany({ commentId: replyId });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete reply:', error);
      return false;
    }
  }

  static async toggleReplyApproval(replyId: string): Promise<boolean> {
    if (!isServer || !CommentReplyModel) {
      return false;
    }

    try {
      await this.connect();
      
      const reply = await CommentReplyModel.findById(replyId);
      if (!reply) {
        console.error('Reply not found:', replyId);
        return false;
      }
      
      const newApprovalStatus = !reply.isApproved;
      const result = await CommentReplyModel.updateOne(
        { _id: replyId },
        { isApproved: newApprovalStatus }
      );
      
      console.log(`Reply ${replyId} approval toggled to: ${newApprovalStatus}`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to toggle reply approval:', error);
      return false;
    }
  }

  static async getUserLikeHistory(
    userId?: string,
    ipAddress?: string
  ): Promise<string[]> {
    if (!isServer || !CommentLikeModel) {
      return [];
    }

    try {
      await this.connect();

      const query = userId 
        ? { userId }
        : { ipAddress };

      const likes = await CommentLikeModel.find(query)
        .select('commentId')
        .lean();

      return likes.map((like: any) => like.commentId.toString());
    } catch (error) {
      console.error('Failed to get user like history:', error);
      return [];
    }
  }

  static async getUserById(userId: string): Promise<any> {
    if (!isServer || !UserModel) {
      return null;
    }

    try {
      await this.connect();
      const user = await UserModel.findById(userId).lean();
      
      if (user) {
        return {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isActive: user.isActive
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }
}
