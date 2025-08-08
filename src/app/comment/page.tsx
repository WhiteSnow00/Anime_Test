"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  MessageCircle, 
  Squirrel, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  Eye,
  EyeOff,
  BarChart3,
  Calendar,
  Lock,
  Play,
  Heart,
  Reply,
  Turtle,
  Snowflake,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedComment {
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
  userRole?: 'user' | 'administrator';
  likeCount: number;
  replies: any[];
  replyCount: number;
}

interface EnhancedStats {
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  commentsToday: number;
  totalLikes: number;
  totalReplies: number;
  repliesWithLikes: number;
  registeredComments: number;
  guestComments: number;
  registeredReplies: number;
  guestReplies: number;
  totalInteractions: number;
  averageLikesPerComment: string;
  averageRepliesPerComment: string;
}

export default function EnhancedCommentManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [comments, setComments] = useState<EnhancedComment[]>([]);
  const [stats, setStats] = useState<EnhancedStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'with-replies' | 'with-likes'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/comments/admin-enhanced?password=${encodeURIComponent(password)}`);
      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        setComments(result.comments);
        setStats(result.stats);
        sessionStorage.setItem('admin-auth', 'true');
        sessionStorage.setItem('admin-password', password);
      } else {
        setAuthError('Mật khẩu không đúng. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setComments([]);
    setStats(null);
    sessionStorage.removeItem('admin-auth');
    sessionStorage.removeItem('admin-password');
  };

  const refreshData = async () => {
    if (!password) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/comments/admin-enhanced?password=${encodeURIComponent(password)}`);
      const result = await response.json();
      
      if (result.success) {
        setComments(result.comments);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCommentApproval = async (commentId: string) => {
    try {
      const response = await fetch('/api/comments/admin-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'toggle-approval',
          commentId
        })
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Toggle approval error:', error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này và tất cả trả lời của nó?')) return;
    
    try {
      const response = await fetch('/api/comments/admin-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'delete',
          commentId
        })
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const toggleReplyApproval = async (replyId: string) => {
    try {
      const response = await fetch('/api/comments/admin-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'toggle-reply-approval',
          replyId
        })
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Toggle reply approval error:', error);
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm('Bạn có chắc muốn xóa trả lời này?')) return;
    
    try {
      const response = await fetch('/api/comments/admin-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'delete-reply',
          replyId
        })
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Delete reply error:', error);
    }
  };

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const filteredComments = comments.filter(comment => {
    const matchesFilter = filter === 'all' || 
      (filter === 'approved' && comment.isApproved) ||
      (filter === 'pending' && !comment.isApproved) ||
      (filter === 'with-replies' && comment.replyCount > 0) ||
      (filter === 'with-likes' && comment.likeCount > 0);
    
    const matchesSearch = searchTerm === '' ||
      comment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (comment.displayName && comment.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin-auth');
    const savedPassword = sessionStorage.getItem('admin-password');
    
    if (savedAuth === 'true' && savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
      setIsLoading(true);
      fetch(`/api/comments/admin-enhanced?password=${encodeURIComponent(savedPassword)}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setComments(result.comments);
            setStats(result.stats);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Quản lý bình luận</h1>
            <p className="text-sm text-muted-foreground">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu admin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý bình luận</h1>
            <p className="text-muted-foreground">Quản lý bình luận, trả lời và tương tác</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              Đăng xuất
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshData} 
              disabled={isLoading}
              title="Làm mới dữ liệu"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Enhanced Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng bình luận</p>
                  <p className="text-2xl font-bold">{stats.totalComments}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng lượt thích</p>
                  <p className="text-2xl font-bold">{stats.totalLikes}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Reply className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng trả lời</p>
                  <p className="text-2xl font-bold">{stats.totalReplies}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 dark:bg-muted/30 rounded-lg flex items-center justify-center">
                  <Turtle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BL thành viên</p>
                  <p className="text-2xl font-bold">{stats.registeredComments}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 dark:bg-muted/30 rounded-lg flex items-center justify-center">
                  <Squirrel className="h-5 w-5 text-muted-foreground/70" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BL khách</p>
                  <p className="text-2xl font-bold">{stats.guestComments}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tương tác</p>
                  <p className="text-2xl font-bold">{stats.totalInteractions}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Additional Stats */}
        {stats && (
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">TB lượt thích/bình luận</span>
                <Badge variant="secondary">{stats.averageLikesPerComment}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">TB trả lời/bình luận</span>
                <Badge variant="secondary">{stats.averageRepliesPerComment}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trả lời từ thành viên</span>
                <Badge variant="secondary">{stats.registeredReplies}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bình luận hôm nay</span>
                <Badge variant="secondary">{stats.commentsToday}</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tất cả ({comments.length})
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
              >
                Đã duyệt ({comments.filter(c => c.isApproved).length})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Chờ duyệt ({comments.filter(c => !c.isApproved).length})
              </Button>
              <Button
                variant={filter === 'with-replies' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('with-replies')}
              >
                Có trả lời ({comments.filter(c => c.replyCount > 0).length})
              </Button>
              <Button
                variant={filter === 'with-likes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('with-likes')}
              >
                Có lượt thích ({comments.filter(c => c.likeCount > 0).length})
              </Button>
            </div>

            <Input
              placeholder="Tìm kiếm theo tên hoặc nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {/* Comments List */}
        <Card className="p-6">
          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Không có bình luận nào</p>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div key={comment._id} className="border rounded-lg p-4 space-y-3">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        comment.userRole === 'administrator' ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50 dark:bg-muted/30"
                      )}>
                        {comment.userRole === 'administrator' ? (
                          <Snowflake className="h-4 w-4 text-red-500/80" />
                        ) : comment.userId ? (
                          <Turtle className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Squirrel className="h-4 w-4 text-muted-foreground/70" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {comment.displayName || comment.userName}
                          </span>
                          {comment.userId && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                comment.userRole === 'administrator' && "border-red-500/40 text-red-600/90 bg-red-50/50 dark:bg-red-950/20"
                              )}
                            >
                              {comment.userRole === 'administrator' ? (
                                <>
                                  <Snowflake className="h-3 w-3 mr-1" />
                                  Quản Trị Viên
                                </>
                              ) : (
                                <>
                                  <Turtle className="h-3 w-3 mr-1" />
                                  Thành Viên
                                </>
                              )}
                            </Badge>
                          )}
                          {comment.episodeViewing && (
                            <Badge variant="outline" className="text-xs">
                              <Play className="h-3 w-3 mr-1" />
                              Tập {comment.episodeViewing}
                            </Badge>
                          )}
                          <Badge variant={comment.isApproved ? 'default' : 'secondary'} className="text-xs">
                            {comment.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(comment.timestamp).toLocaleString('vi-VN')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {comment.likeCount} lượt thích
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {comment.replyCount} trả lời
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={comment.isApproved ? "outline" : "default"}
                        onClick={() => toggleCommentApproval(comment._id!)}
                      >
                        {comment.isApproved ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteComment(comment._id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="pl-11">
                    <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-3">
                      {comment.content}
                    </p>
                  </div>

                  {/* Replies Section */}
                  {comment.replyCount > 0 && (
                    <div className="pl-11">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCommentExpansion(comment._id!)}
                        className="text-xs"
                      >
                        {expandedComments.has(comment._id!) ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ẩn {comment.replyCount} trả lời
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Xem {comment.replyCount} trả lời
                          </>
                        )}
                      </Button>

                      {expandedComments.has(comment._id!) && (
                        <div className="mt-3 space-y-2">
                          {comment.replies.map((reply: any) => (
                            <div key={reply._id} className="border-l-2 border-primary/20 pl-4 py-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {reply.displayName || reply.userName}
                                    </span>
                                    {reply.userId && (
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-xs",
                                          reply.userRole === 'administrator' && "border-red-500/40 text-red-600/90 bg-red-50/50 dark:bg-red-950/20"
                                        )}
                                      >
                                        {reply.userRole === 'administrator' ? (
                                          <>
                                            <Snowflake className="h-2.5 w-2.5 mr-0.5" />
                                            Quản Trị Viên
                                          </>
                                        ) : (
                                          <>
                                            <Turtle className="h-2.5 w-2.5 mr-0.5" />
                                            Thành Viên
                                          </>
                                        )}
                                      </Badge>
                                    )}
                                    <Badge variant={reply.isApproved ? 'default' : 'secondary'} className="text-xs">
                                      {reply.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm mt-1">{reply.content}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>{new Date(reply.timestamp).toLocaleString('vi-VN')}</span>
                                    <span className="flex items-center gap-1">
                                      <Heart className="h-3 w-3" />
                                      {reply.likeCount}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleReplyApproval(reply._id)}
                                  >
                                    {reply.isApproved ? <EyeOff className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteReply(reply._id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Info */}
                  {comment.ipAddress && (
                    <details className="pl-11">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Thông tin kỹ thuật
                      </summary>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>IP: {comment.ipAddress}</p>
                        <p>User Agent: {comment.userAgent}</p>
                        <p>ID: {comment._id}</p>
                        {comment.userId && <p>User ID: {comment.userId}</p>}
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
