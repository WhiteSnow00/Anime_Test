"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Copy, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';

export default function MigrationPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const testConnections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-connections',
          adminPassword
        })
      });
      
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Failed to test connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const compareData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare-data',
          adminPassword
        })
      });
      
      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error('Failed to compare data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performMigration = async () => {
    if (!adminPassword) {
      alert('Please enter the admin password');
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to migrate data from PostgreSQL to MongoDB? This will copy all comments to MongoDB.'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          adminPassword
        })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Migration failed:', error);
      setResults({ error: 'Migration failed', message: error });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => 
    status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Database Migration Dashboard
            </CardTitle>
            <p className="text-muted-foreground">
              Migrate comment data from PostgreSQL (Neon) to MongoDB
            </p>
          </CardHeader>
        </Card>

        {/* Admin Password */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter admin password (migrate123!)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="flex-1"
              />
              <Button onClick={testConnections} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Test Connections
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Default password: <code>migrate123!</code>
            </p>
          </CardContent>
        </Card>

        {/* Connection Status */}
        {connectionStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Database Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">PostgreSQL (Neon)</h3>
                    <p className="text-sm text-muted-foreground">Source Database</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={connectionStatus.postgresql?.connected} />
                    <Badge variant={connectionStatus.postgresql?.connected ? "default" : "destructive"}>
                      {connectionStatus.postgresql?.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">MongoDB</h3>
                    <p className="text-sm text-muted-foreground">Target Database</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={connectionStatus.mongodb?.connected} />
                    <Badge variant={connectionStatus.mongodb?.connected ? "default" : "destructive"}>
                      {connectionStatus.mongodb?.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Data Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={compareData} disabled={isLoading || !adminPassword} className="mb-4">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Compare Data
            </Button>
            
            {comparisonData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">PostgreSQL Data</h3>
                  <p className="text-2xl font-bold text-blue-600">{comparisonData.comparison.postgresql.count}</p>
                  <p className="text-sm text-muted-foreground">Total Comments</p>
                  {comparisonData.comparison.postgresql.sample.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium">Sample:</p>
                      {comparisonData.comparison.postgresql.sample.map((comment: any, index: number) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          {comment.userName}: {comment.id}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">MongoDB Data</h3>
                  <p className="text-2xl font-bold text-green-600">{comparisonData.comparison.mongodb.count}</p>
                  <p className="text-sm text-muted-foreground">Total Comments</p>
                  {comparisonData.comparison.mongodb.sample.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium">Sample:</p>
                      {comparisonData.comparison.mongodb.sample.map((comment: any, index: number) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          {comment.userName}: {comment.id}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migration Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Perform Migration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                This will copy all data from PostgreSQL to MongoDB. The PostgreSQL data will remain unchanged.
                Make sure both databases are connected before proceeding.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={performMigration} 
              disabled={isLoading || !adminPassword}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Start Migration
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Migration Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Migration Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Migration Failed:</strong> {results.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Migration Completed Successfully!</strong>
                    <br />
                    PostgreSQL Comments: {results.stats?.postgresComments}
                    <br />
                    MongoDB Comments: {results.stats?.mongoComments}
                    <br />
                    Completed at: {results.stats?.timestamp}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">1. Test database connections above</p>
            <p className="text-sm">2. Compare data to see current state</p>
            <p className="text-sm">3. Perform migration when ready</p>
            <p className="text-sm">4. Update your app to use MongoDB endpoints</p>
            <p className="text-sm text-muted-foreground">
              New MongoDB APIs: <code>/api/mongodb/comments</code> and <code>/api/mongodb/admin</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
