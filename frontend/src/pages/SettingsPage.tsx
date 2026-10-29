import React, { useState } from 'react';
import { apiFetch, getBaseApiUrl } from '../api/client';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import {
  Server,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { backendStatus, checkBackendHealth } = useApp();
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [isTestingDb, setIsTestingDb] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: string; detail?: string } | null>(null);

  const testDatabaseConnection = async () => {
    setIsTestingDb(true);
    try {
      const res = await apiFetch<{ status: string; database?: string }>('/health/database', {
        timeoutMs: 5000,
      });
      setDbStatus(res.status);
      setTestResult({ status: 'success', detail: `Connected to PostgreSQL database: ${res.database || 'infinite_knowledge'}` });
    } catch (err: unknown) {
      setDbStatus('failed');
      setTestResult({ status: 'error', detail: (err as Error)?.message || 'Database test failed' });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleFullHealthCheck = async () => {
    await checkBackendHealth();
    await testDatabaseConnection();
  };

  return (
    <div className="settings-page animate-fade-in" style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
          Settings & Backend Integration
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
          Live configuration and database connectivity status.
        </p>
      </div>

      {/* Backend API Status Card */}
      <Card padding="lg">
        <CardHeader>
          <CardTitle>
            <Server size={17} />
            <span>FastAPI Server Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Backend Base URL</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {getBaseApiUrl()}
                </div>
              </div>
              <Badge variant="accent" size="sm">
                Configured via VITE_API_BASE_URL
              </Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>API Health Status</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Endpoint: GET /health</div>
              </div>
              <StatusIndicator
                status={backendStatus}
                label={backendStatus === 'online' ? 'Operational' : backendStatus === 'offline' ? 'Unreachable' : 'Checking'}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>PostgreSQL Database Connection</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Endpoint: GET /health/database</div>
              </div>
              <div>
                {dbStatus ? (
                  <Badge variant={dbStatus === 'connected' ? 'success' : 'danger'} size="sm" dot>
                    {dbStatus === 'connected' ? 'Connected' : 'Connection Error'}
                  </Badge>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not tested yet</span>
                )}
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: testResult.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${testResult.status === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  fontSize: 12.5,
                  color: testResult.status === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {testResult.status === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span>{testResult.detail}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFullHealthCheck}
                isLoading={isTestingDb}
                leftIcon={<RotateCcw size={14} />}
              >
                Test API & Database Connectivity
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
