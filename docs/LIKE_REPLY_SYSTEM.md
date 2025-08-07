# Like and Reply System Documentation

## Overview
This document describes the comprehensive like and reply system implemented for the anime website's comment section. The system enables users to interact with comments through likes and replies, with specific authentication requirements.

## Key Features

### 1. Like System
- **No Login Required**: Guest users can like comments anonymously
- **IP-Based Tracking**: Anonymous likes are tracked by IP address
- **User Tracking**: Authenticated users' likes are tracked by user ID
- **Duplicate Prevention**: One like per comment per user/IP
- **Real-time Updates**: Optimistic UI updates with server validation
- **Visual Feedback**: Heart icon animation and count updates

### 2. Reply System  
- **Login Required**: Only authenticated users can post replies
- **Login Prompt**: Guest users see a login modal when attempting to reply
- **Nested Display**: Replies are shown indented under parent comments
- **Reply Likes**: Replies can also be liked using the same system
- **Character Limit**: 1000 character maximum for replies
- **Emoji Support**: Full emoji support in replies

### 3. User Experience
- **Always Visible Buttons**: Like and reply buttons are always shown
- **Responsive Design**: Mobile-optimized interface
- **Loading States**: Clear loading indicators for all actions
- **Error Handling**: Informative error messages
- **Optimistic Updates**: Immediate UI feedback before server confirmation

## Technical Implementation

### Database Schema

#### Extended Comment Schema
```typescript
interface ExtendedComment {
  _id?: string;
  userName: string;
  displayName?: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent?: string;
  ipAddress?: string;
  episodeViewing?: number;
  userId?: string;
  // New fields
  likes: CommentLike[];
  likeCount: number;
  replies?: CommentReply[];
  replyCount: number;
}
```

#### Comment Like Schema
```typescript
interface CommentLike {
  userId?: string;        // For authenticated users
  ipAddress: string;      // For guest users
  timestamp: Date;
  userAgent?: string;
}
```

#### Comment Reply Schema
```typescript
interface CommentReply {
  _id?: string;
  parentCommentId: string;
  id: string;
  userName: string;
  displayName?: string;
  userId?: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
  likes: CommentLike[];
  likeCount: number;
}
```

### API Endpoints

#### Like Endpoints
- `POST /api/comments/like` - Toggle like/unlike
- `GET /api/comments/like?commentId={id}` - Get like status

#### Reply Endpoints
- `POST /api/comments/reply` - Add a reply (auth required)
- `GET /api/comments/reply?commentId={id}` - Get replies for a comment

#### Enhanced Comments Endpoint
- `GET /api/comments?episode={id}` - Get comments with likes and replies

### Component Structure

#### CommentItem Component
The main component that handles comment display with like and reply functionality:
- Manages like state and interactions
- Handles reply form display
- Shows nested replies
- Integrates authentication modal for guest users

#### Key Features:
- Optimistic UI updates
- Real-time like count updates
- Inline reply form
- Collapsible reply threads
- Loading states for all actions

### Authentication Flow

#### Like Flow (No Auth Required)
1. User clicks like button
2. System checks if user/IP has already liked
3. Toggle like status
4. Update UI optimistically
5. Confirm with server
6. Update final state

#### Reply Flow (Auth Required)
1. User clicks reply button
2. Check authentication status
3. If not logged in: Show login modal
4. If logged in: Show inline reply form
5. User submits reply
6. Reply appears immediately in thread

## Security Considerations

### Rate Limiting
- IP-based rate limiting for anonymous likes
- User-based rate limiting for authenticated actions
- Protection against spam and abuse

### Input Validation
- Content length validation (max 1000 chars)
- XSS prevention through content sanitization
- SQL injection prevention through parameterized queries
- Profanity filtering (optional)

### Authentication Security
- JWT token validation for authenticated users
- Session management
- Secure cookie handling

## Performance Optimizations

### Database Indexes
```javascript
// MongoDB indexes for optimal performance
commentLikeSchema.index({ commentId: 1, userId: 1 });
commentLikeSchema.index({ commentId: 1, ipAddress: 1 });
commentReplySchema.index({ parentCommentId: 1 });
commentReplySchema.index({ timestamp: -1 });
```

### Caching Strategy
- Cache like counts on comment documents
- Limit initial reply load (first 5 replies)
- Load more replies on demand

### Optimistic UI Updates
- Immediate visual feedback for likes
- Instant reply display after submission
- Background synchronization with server

## User Interface Details

### Like Button States
- **Default**: Empty heart icon with count
- **Liked**: Filled red heart with updated count
- **Loading**: Disabled state during API call
- **Hover**: Subtle scale animation

### Reply Button States
- **Default**: Reply icon with count (if replies exist)
- **Active**: Shows inline reply form
- **Guest**: Triggers login modal
- **Loading**: Disabled during submission

### Mobile Optimizations
- Touch-friendly button sizes (min 44x44px)
- Responsive layout for small screens
- Optimized loading for mobile networks
- Swipe gestures for navigation (optional)

## Testing Checklist

### Functionality Tests
- [ ] Guest users can like comments without login
- [ ] Authenticated users can like/unlike comments
- [ ] Duplicate likes are prevented
- [ ] Login prompt appears for guest reply attempts
- [ ] Authenticated users can reply successfully
- [ ] Replies display with proper indentation
- [ ] Like counts update in real-time
- [ ] Reply counts are accurate

### Edge Cases
- [ ] Network interruption handling
- [ ] Concurrent like/unlike operations
- [ ] Very long comment/reply content
- [ ] Rapid clicking prevention
- [ ] Session expiration during interaction

### Performance Tests
- [ ] Page load time with many comments
- [ ] Like operation response time
- [ ] Reply submission performance
- [ ] Database query optimization

## Migration Guide

### From Existing System
1. Run database migration to add new fields
2. Update API endpoints to include like/reply data
3. Replace comment components with enhanced versions
4. Test authentication integration
5. Deploy with feature flags (optional)

### Rollback Plan
1. Keep original comment components available
2. Database changes are backward compatible
3. API versioning for gradual migration
4. Feature flags for controlled rollout

## Future Enhancements

### Planned Features
- Multi-level nested replies (currently 1 level)
- Reply notifications
- Like animations and effects
- User reaction types (beyond just likes)
- Comment sorting by likes/newest/oldest
- Rich text formatting in replies
- @mentions in replies
- Edit/delete functionality for own comments

### Performance Improvements
- WebSocket for real-time updates
- Redis caching for like counts
- Pagination for large reply threads
- Lazy loading for nested comments

## Troubleshooting

### Common Issues

#### Likes Not Persisting
- Check MongoDB connection
- Verify IP address detection
- Confirm user authentication status

#### Reply Button Not Working
- Verify authentication system is running
- Check auth modal component integration
- Confirm API endpoint accessibility

#### Performance Issues
- Review database indexes
- Check MongoDB query performance
- Optimize component re-renders
- Implement pagination for large datasets

## API Response Examples

### Like Toggle Response
```json
{
  "success": true,
  "likeCount": 42,
  "userLiked": true
}
```

### Reply Submission Response
```json
{
  "success": true,
  "reply": {
    "_id": "507f1f77bcf86cd799439011",
    "parentCommentId": "507f1f77bcf86cd799439010",
    "userName": "user123",
    "content": "Great episode!",
    "timestamp": "2024-01-20T10:30:00Z",
    "likeCount": 0
  }
}
```

### Comments with Interactions
```json
{
  "success": true,
  "comments": [{
    "_id": "507f1f77bcf86cd799439010",
    "userName": "anime_fan",
    "content": "Amazing animation!",
    "likeCount": 15,
    "userLiked": true,
    "replies": [{
      "_id": "507f1f77bcf86cd799439011",
      "userName": "otaku123",
      "content": "Totally agree!",
      "likeCount": 3,
      "userLiked": false
    }],
    "replyCount": 5
  }]
}
```

## Support and Maintenance

### Monitoring
- Track like/reply API response times
- Monitor database query performance
- Log authentication failures
- Track user engagement metrics

### Regular Maintenance
- Clean up orphaned likes periodically
- Archive old comments/replies
- Update spam detection rules
- Review and optimize indexes

### Contact
For issues or questions about the like and reply system, please contact the development team.
