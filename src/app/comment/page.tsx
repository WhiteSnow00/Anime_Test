"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminComments } from '@/hooks/use-comments';
import { 
  Shield, 
  MessageCircle, 
  User, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  Eye,
  EyeOff,
  BarChart3,
  Calendar,
  TrendingUp,
  Lock,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { comments, stats, isLoading, toggleApproval, deleteComment, refreshComments } = useAdminComments(
    isAuthenticated && password ? password : ''
  );

  useEffect(() => {
    sessionStorage.removeItem('comment-admin-auth');
    sessionStorage.removeItem('comment-admin-password');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
      try {
      const response = await fetch(`/api/comments/admin?password=${encodeURIComponent(password)}`);
      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        setAuthError('');
        sessionStorage.setItem('comment-admin-auth', 'true');
        sessionStorage.setItem('comment-admin-password', password);
      } else {
        setAuthError('Mật khẩu không đúng. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    sessionStorage.removeItem('comment-admin-auth');
    sessionStorage.removeItem('comment-admin-password');
  };

  const filteredComments = comments.filter(comment => {
    const matchesFilter = filter === 'all' || 
      (filter === 'approved' && comment.isApproved) ||
      (filter === 'pending' && !comment.isApproved);
    
    const matchesSearch = searchTerm === '' ||
      comment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-4 sm:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Quản lý bình luận</h1>
            <p className="text-sm text-muted-foreground">Vui lòng nhập mật khẩu để tiếp tục</p>
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
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 text-base"
                />
              </div>
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{authError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-11 text-base">
              Đăng nhập
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Quản lý bình luận</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Theo dõi và quản lý tất cả bình luận</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="self-start sm:self-auto">
            Đăng xuất
          </Button>
        </div>

        {/* Statistics */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg animate-pulse mx-auto sm:mx-0" />
                  <div className="space-y-1 sm:space-y-2 text-center sm:text-left">
                    <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse w-16 sm:w-20 mx-auto sm:mx-0" />
                    <div className="h-4 sm:h-6 bg-gray-200 rounded animate-pulse w-8 sm:w-12 mx-auto sm:mx-0" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">Tổng bình luận</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.totalComments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">Đã duyệt</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.approvedComments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">Chờ duyệt</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.pendingComments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">Hôm nay</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.commentsToday}</p>
              </div>
            </div>
          </Card>
        </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg animate-pulse mx-auto sm:mx-0" />
                  <div className="text-center sm:text-left">
                    <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mb-1 mx-auto sm:mx-0" />
                    <div className="h-4 sm:h-6 w-8 sm:w-12 bg-gray-200 rounded animate-pulse mx-auto sm:mx-0" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Filter buttons - stack on mobile */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="text-xs sm:text-sm"
              >
                Tất cả {stats ? `(${stats.totalComments})` : ''}
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
                className="text-xs sm:text-sm"
              >
                Đã duyệt {stats ? `(${stats.approvedComments})` : ''}
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
                className="text-xs sm:text-sm"
              >
                Chờ duyệt {stats ? `(${stats.pendingComments})` : ''}
              </Button>
            </div>

            {/* Search and refresh */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Tìm kiếm theo tên hoặc nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button variant="outline" onClick={refreshComments} size="sm" className="self-start sm:self-auto">
                Làm mới
              </Button>
            </div>
          </div>
        </Card>

        {/* Comments List */}
        <Card className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Không có bình luận nào</p>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div key={comment._id || `admin-comment-${comment.userName}-${comment.timestamp}`} className="border rounded-lg p-3 sm:p-4 space-y-3 admin-comment-card">
                  {/* Comment Header - Mobile optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium text-sm sm:text-base truncate">{comment.userName}</span>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            {comment.episodeViewing && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Play className="h-2 w-2 sm:h-3 sm:w-3" />
                                Tập {comment.episodeViewing}
                              </Badge>
                            )}
                            <Badge variant={comment.isApproved ? 'default' : 'secondary'} className="text-xs">
                              {comment.isApproved ? (
                                <>
                                  <Eye className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                  Đã duyệt
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                  Chờ duyệt
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{comment.timestamp.toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - Better mobile layout */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={comment.isApproved ? "outline" : "default"}
                        onClick={() => toggleApproval(comment._id!)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        {comment.isApproved ? (
                          <>
                            <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Ẩn</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Duyệt</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa bình luận này?')) {
                            deleteComment(comment._id!);
                          }
                        }}
                        className="px-2 sm:px-3"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="pl-8 sm:pl-11">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-muted/30 rounded-md p-2 sm:p-3">
                      {comment.content}
                    </p>
                  </div>

                  {/* Comment Metadata - Collapsible on mobile */}
                  {comment.userAgent && (
                    <div className="pl-8 sm:pl-11 text-xs text-muted-foreground">
                      <details>
                        <summary className="cursor-pointer hover:text-foreground">
                          Thông tin kỹ thuật
                        </summary>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="break-all">User Agent: {comment.userAgent}</p>
                          <p>IP: {comment.ipAddress}</p>
                          <p>ID: {comment._id}</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Overall Statistics */}
        {stats && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tổng quan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">Tổng số bình luận</span>
                <Badge variant="secondary">{stats.totalComments}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">Bình luận hôm nay</span>
                <Badge variant="secondary">{stats.commentsToday}</Badge>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}