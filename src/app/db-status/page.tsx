"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Plus, 
  RefreshCw,
  MessageCircle,
  Server,
  Monitor
} from 'lucide-react';

export default function DatabaseStatusPage() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testComment, setTestComment] = useState({ userName: '', content: '' });
  const [testResult, setTestResult] = useState<any>(null);

  const checkDatabaseStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Failed to check database status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTestComment = async () => {
    if (!testComment.userName || !testComment.content) {
      alert('Please fill in both userName and content');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testComment)
      });
      
      const data = await response.json();
      setTestResult(data);
      
      // Refresh status after adding comment
      setTimeout(checkDatabaseStatus, 1000);
    } catch (error) {
      console.error('Failed to add test comment:', error);
      setTestResult({ error: 'Failed to add test comment' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Database Status Dashboard
            </CardTitle>
            <p className="text-muted-foreground">
              Monitor the current database configuration and test comment functionality
            </p>
          </CardHeader>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Database Status
              <Button onClick={checkDatabaseStatus} disabled={isLoading} size="sm">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Database Type</h3>
                      <p className="text-2xl font-bold text-primary">{dbStatus.database}</p>
                    </div>
                    <Database className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Total Comments</h3>
                      <p className="text-2xl font-bold text-blue-600">{dbStatus.totalComments}</p>
                    </div>
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Environment</h3>
                      <Badge variant={dbStatus.environment === 'development' ? 'default' : 'secondary'}>
                        {dbStatus.environment}
                      </Badge>
                    </div>
                    <Monitor className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2 text-green-600">Approved Comments</h3>
                    <p className="text-2xl font-bold">{dbStatus.approvedComments}</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2 text-orange-600">Pending Comments</h3>
                    <p className="text-2xl font-bold">{dbStatus.pendingComments}</p>
                  </div>
                </div>

                {dbStatus.sampleComments && dbStatus.sampleComments.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Sample Comments</h3>
                    <div className="space-y-2">
                      {dbStatus.sampleComments.map((comment: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{comment.userName}</span>
                            <Badge variant={comment.isApproved ? "default" : "secondary"}>
                              {comment.isApproved ? 'Approved' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {comment.id} | {new Date(comment.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Click refresh to check database status</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Comment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Comment Submission</CardTitle>
            <p className="text-muted-foreground">
              Add a test comment to verify the database is working correctly
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User Name</label>
                <Input
                  placeholder="Enter test user name"
                  value={testComment.userName}
                  onChange={(e) => setTestComment({ ...testComment, userName: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Comment Content</label>
                <Textarea
                  placeholder="Enter test comment content"
                  value={testComment.content}
                  onChange={(e) => setTestComment({ ...testComment, content: e.target.value })}
                />
              </div>
              
              <Button onClick={addTestComment} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Test Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle>Test Result</CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.error ? (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Test Failed:</strong> {testResult.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Test Successful!</strong> Comment added to {testResult.database}
                    <br />
                    <small>Comment ID: {testResult.comment?.id}</small>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Alert>
              <Server className="w-4 h-4" />
              <AlertDescription>
                <strong>Development Mode:</strong> Using MongoDB for localhost testing
                <br />
                <strong>Production Mode:</strong> Using PostgreSQL for deployment
                <br />
                <strong>Current Environment:</strong> {dbStatus?.environment || 'Unknown'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              • Comments added on localhost will go to MongoDB
            </p>
            <p className="text-sm text-muted-foreground">
              • Comments added on production will go to PostgreSQL (Neon)
            </p>
            <p className="text-sm text-muted-foreground">
              • Migration has copied existing data from PostgreSQL to MongoDB
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
