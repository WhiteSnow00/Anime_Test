import mongoose from 'mongoose';
import { ExtendedComment } from '@/types/comment-extended';

/**
 * OPTIMIZED METHODS for MongoDBExtendedService
 * Add these methods to the existing MongoDBExtendedService class
 */

// Add this method to the MongoDBExtendedService class
export async function getCommentsWithInteractionsOptimized(
  episodeId?: number,
  userId?: string,
  ipAddress?: string
): Promise<ExtendedComment[]> {
  const isServer = typeof window === 'undefined';
  if (!isServer) {
    return [];
  }

  try {
    // Connect to MongoDB
    await this.connect();
    
    const db = mongoose.connection.db;
    const commentsCollection = db.collection('comments');
    const repliesCollection = db.collection('comment_replies');
    const likesCollection = db.collection('comment_likes');

    // Build match stage for filtering
    const matchStage: any = { isApproved: true };
    if (episodeId) {
      matchStage.episodeViewing = episodeId;
    }

    // Use aggregation pipeline to fetch all data in one query
    const pipeline = [
      // Stage 1: Match approved comments (and optionally by episode)
      { $match: matchStage },
      
      // Stage 2: Sort by timestamp
      { $sort: { timestamp: -1 } },
      
      // Stage 3: Lookup replies for each comment
      {
        $lookup: {
          from: 'comment_replies',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$parentCommentId', '$$commentId'] },
                    { $eq: ['$isApproved', true] }
                  ]
                }
              }
            },
            { $sort: { timestamp: 1 } },
            { $limit: 5 }, // Limit replies per comment for performance
            
            // Lookup likes for each reply
            {
              $lookup: {
                from: 'comment_likes',
                let: { replyId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$commentId', '$$replyId'] } } },
                  { $count: 'count' }
                ],
                as: 'likesCount'
              }
            },
            
            // Check if current user liked this reply
            {
              $lookup: {
                from: 'comment_likes',
                let: { replyId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$commentId', '$$replyId'] },
                          userId 
                            ? { $eq: ['$userId', mongoose.Types.ObjectId(userId)] }
                            : { $eq: ['$ipAddress', ipAddress] }
                        ]
                      }
                    }
                  },
                  { $limit: 1 }
                ],
                as: 'userLike'
              }
            },
            
            // Add computed fields
            {
              $addFields: {
                likeCount: { $ifNull: [{ $first: '$likesCount.count' }, 0] },
                userLiked: { $gt: [{ $size: '$userLike' }, 0] }
              }
            },
            
            // Clean up unnecessary fields
            {
              $project: {
                likesCount: 0,
                userLike: 0
              }
            }
          ],
          as: 'replies'
        }
      },
      
      // Stage 4: Lookup total reply count
      {
        $lookup: {
          from: 'comment_replies',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$parentCommentId', '$$commentId'] },
                    { $eq: ['$isApproved', true] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'replyCountData'
        }
      },
      
      // Stage 5: Lookup likes for the main comment
      {
        $lookup: {
          from: 'comment_likes',
          let: { commentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$commentId', '$$commentId'] } } },
            { $count: 'count' }
          ],
          as: 'likesCount'
        }
      },
      
      // Stage 6: Check if current user liked this comment
      {
        $lookup: {
          from: 'comment_likes',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$commentId', '$$commentId'] },
                    userId 
                      ? { $eq: ['$userId', mongoose.Types.ObjectId(userId)] }
                      : { $eq: ['$ipAddress', ipAddress] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'userLike'
        }
      },
      
      // Stage 7: Add computed fields
      {
        $addFields: {
          likeCount: { $ifNull: [{ $first: '$likesCount.count' }, 0] },
          replyCount: { $ifNull: [{ $first: '$replyCountData.count' }, 0] },
          userLiked: { $gt: [{ $size: '$userLike' }, 0] },
          likes: [] // Empty array for compatibility
        }
      },
      
      // Stage 8: Clean up the output
      {
        $project: {
          likesCount: 0,
          replyCountData: 0,
          userLike: 0
        }
      }
    ];

    // Execute the aggregation pipeline
    const comments = await commentsCollection.aggregate(pipeline).toArray();

    // Transform the results to match the expected format
    const formattedComments = comments.map((comment: any) => ({
      _id: comment._id.toString(),
      userName: comment.userName,
      displayName: comment.displayName,
      userId: comment.userId?.toString(),
      content: comment.content,
      timestamp: comment.timestamp,
      isApproved: comment.isApproved,
      userAgent: comment.userAgent,
      ipAddress: comment.ipAddress,
      episodeViewing: comment.episodeViewing,
      likes: comment.likes || [],
      likeCount: comment.likeCount || 0,
      replies: (comment.replies || []).map((reply: any) => ({
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
        likeCount: reply.likeCount || 0,
        userLiked: reply.userLiked || false
      })),
      replyCount: comment.replyCount || 0,
      userLiked: comment.userLiked || false
    }));

    console.log(`[MongoDB-Optimized] Fetched ${formattedComments.length} comments with all interactions in a single aggregation pipeline`);
    
    return formattedComments;
  } catch (error) {
    console.error('[MongoDB-Optimized] Failed to get comments with interactions:', error);
    throw error;
  }
}

/**
 * Alternative: Batch fetch approach (if aggregation is too complex)
 * This approach fetches data in batches to reduce the number of queries
 */
export async function getCommentsWithInteractionsBatched(
  episodeId?: number,
  userId?: string,
  ipAddress?: string
): Promise<ExtendedComment[]> {
  const isServer = typeof window === 'undefined';
  if (!isServer) {
    return [];
  }

  try {
    await this.connect();
    
    // Step 1: Fetch all comments
    const comments = await this.getComments();
    const filteredComments = episodeId
      ? comments.filter(c => c.episodeViewing === episodeId)
      : comments;
    
    if (filteredComments.length === 0) {
      return [];
    }

    // Step 2: Collect all comment IDs
    const commentIds = filteredComments.map(c => c._id!);
    
    // Step 3: Batch fetch all likes for all comments at once
    const db = mongoose.connection.db;
    const likesCollection = db.collection('comment_likes');
    
    const allLikes = await likesCollection.aggregate([
      {
        $match: {
          commentId: { $in: commentIds.map(id => mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$commentId',
          count: { $sum: 1 },
          userLikes: {
            $push: {
              userId: '$userId',
              ipAddress: '$ipAddress'
            }
          }
        }
      }
    ]).toArray();
    
    // Create a map for quick lookup
    const likesMap = new Map();
    allLikes.forEach(item => {
      likesMap.set(item._id.toString(), {
        count: item.count,
        userLikes: item.userLikes
      });
    });
    
    // Step 4: Batch fetch all replies for all comments at once
    const repliesCollection = db.collection('comment_replies');
    const allReplies = await repliesCollection.find({
      parentCommentId: { $in: commentIds.map(id => mongoose.Types.ObjectId(id)) },
      isApproved: true
    }).sort({ timestamp: 1 }).toArray();
    
    // Group replies by parent comment
    const repliesMap = new Map();
    allReplies.forEach(reply => {
      const parentId = reply.parentCommentId.toString();
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId).push(reply);
    });
    
    // Step 5: Batch fetch likes for all replies
    const replyIds = allReplies.map(r => r._id);
    const replyLikes = await likesCollection.aggregate([
      {
        $match: {
          commentId: { $in: replyIds }
        }
      },
      {
        $group: {
          _id: '$commentId',
          count: { $sum: 1 },
          userLikes: {
            $push: {
              userId: '$userId',
              ipAddress: '$ipAddress'
            }
          }
        }
      }
    ]).toArray();
    
    const replyLikesMap = new Map();
    replyLikes.forEach(item => {
      replyLikesMap.set(item._id.toString(), {
        count: item.count,
        userLikes: item.userLikes
      });
    });
    
    // Step 6: Assemble the final result
    const enhancedComments = filteredComments.map(comment => {
      const commentLikes = likesMap.get(comment._id!) || { count: 0, userLikes: [] };
      const commentReplies = repliesMap.get(comment._id!) || [];
      
      // Check if user liked this comment
      const userLiked = commentLikes.userLikes.some((like: any) => 
        userId ? like.userId?.toString() === userId : like.ipAddress === ipAddress
      );
      
      // Process replies
      const processedReplies = commentReplies.slice(0, 5).map((reply: any) => {
        const replyLikesData = replyLikesMap.get(reply._id.toString()) || { count: 0, userLikes: [] };
        const replyUserLiked = replyLikesData.userLikes.some((like: any) => 
          userId ? like.userId?.toString() === userId : like.ipAddress === ipAddress
        );
        
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
          likeCount: replyLikesData.count,
          userLiked: replyUserLiked
        };
      });
      
      return {
        ...comment,
        likes: [],
        likeCount: commentLikes.count,
        replies: processedReplies,
        replyCount: commentReplies.length,
        userLiked
      } as ExtendedComment;
    });
    
    console.log(`[MongoDB-Batched] Fetched ${enhancedComments.length} comments with interactions using batch queries`);
    
    return enhancedComments;
  } catch (error) {
    console.error('[MongoDB-Batched] Failed to get comments with interactions:', error);
    throw error;
  }
}
