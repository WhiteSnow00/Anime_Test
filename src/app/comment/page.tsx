"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminComments } from '@/hooks/use-comments';
import { CommentService } from '@/lib/comment-service';
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
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { comments, toggleApproval, deleteComment, refreshComments } = useAdminComments();

  useEffect(() => {
    // Check if already authenticated in session
    const authStatus = sessionStorage.getItem('comment-admin-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (CommentService.validateAdminPassword(password)) {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('comment-admin-auth', 'true');
    } else {
      setAuthError('Mật khẩu không đúng');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    sessionStorage.removeItem('comment-admin-auth');
  };

  // Get filtered comments
  const filteredComments = comments.filter(comment => {
    const matchesFilter = filter === 'all' || 
      (filter === 'approved' && comment.isApproved) ||
      (filter === 'pending' && !comment.isApproved);
    
    const matchesSearch = searchTerm === '' ||
      comment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Get statistics
  const stats = CommentService.getStats();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Quản lý bình luận</h1>
            <p className="text-muted-foreground">Vui lòng nhập mật khẩu để tiếp tục</p>
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
                  className="pl-10"
                />
              </div>
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full">
              Đăng nhập
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
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả bình luận</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã duyệt</p>
                <p className="text-2xl font-bold">{stats.approvedComments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                <p className="text-2xl font-bold">{stats.pendingComments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hôm nay</p>
                <p className="text-2xl font-bold">{stats.commentsToday}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tất cả ({stats.totalComments})
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
              >
                Đã duyệt ({stats.approvedComments})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Chờ duyệt ({stats.pendingComments})
              </Button>
            </div>

            <div className="flex-1 max-w-md">
              <Input
                placeholder="Tìm kiếm theo tên hoặc nội dung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button variant="outline" onClick={refreshComments}>
              Làm mới
            </Button>
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
                <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.userName}</span>
                          <Badge variant={comment.isApproved ? 'default' : 'secondary'}>
                            {comment.isApproved ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Đã duyệt
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Chờ duyệt
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {comment.timestamp.toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={comment.isApproved ? "outline" : "default"}
                        onClick={() => toggleApproval(comment.id)}
                      >
                        {comment.isApproved ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Ẩn
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Duyệt
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa bình luận này?')) {
                            deleteComment(comment.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="pl-11">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-muted/30 rounded-md p-3">
                      {comment.content}
                    </p>
                  </div>

                  {/* Comment Metadata */}
                  {comment.userAgent && (
                    <div className="pl-11 text-xs text-muted-foreground">
                      <details>
                        <summary className="cursor-pointer hover:text-foreground">
                          Thông tin kỹ thuật
                        </summary>
                        <div className="mt-2 space-y-1">
                          <p>User Agent: {comment.userAgent}</p>
                          <p>IP: {comment.ipAddress}</p>
                          <p>ID: {comment.id}</p>
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
      </div>
    </div>
  );
}
