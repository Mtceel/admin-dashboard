import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './App.css';

const queryClient = new QueryClient();

// SECURITY: Use nginx proxy to internal platform-api (no external API exposure)
const API_URL = '';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

interface Tenant {
  id: number;
  store_name: string;
  subdomain: string;
  status: string;
  created_at: string;
}

interface KubePod {
  name: string;
  status: string;
  restarts: number;
  age: string;
  cpu: string;
  memory: string;
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@fv-company.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/api/login`, {
        email,
        password,
      });

      if (response.data.user.role !== 'super_admin') {
        setError('Super admin access required');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', response.data.token);
      onLogin(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🚀 Super Admin Dashboard</h1>
        <p className="subtitle">fv-company.com Platform Administration</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fv-company.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="info">
          ✅ Real-time Kubernetes monitoring<br />
          ✅ Live tenant management<br />
          ✅ Production-grade security
        </p>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'kubernetes'>('overview');

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/admin/stats`, axiosConfig);
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/admin/tenants`, axiosConfig);
      return response.data.tenants || response.data;
    },
    refetchInterval: 15000,
  });

  // Fetch Kubernetes pods
  const { data: pods, isLoading: podsLoading } = useQuery<KubePod[]>({
    queryKey: ['kubernetes'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/admin/kubernetes`, axiosConfig);
      return response.data.pods;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });

  const handleSuspendTenant = async (tenantId: number) => {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;

    try {
      await axios.post(
        `${API_URL}/api/admin/tenants/${tenantId}/suspend`,
        {},
        axiosConfig
      );
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (err) {
      alert('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async (tenantId: number) => {
    try {
      await axios.post(
        `${API_URL}/api/admin/tenants/${tenantId}/activate`,
        {},
        axiosConfig
      );
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (err) {
      alert('Failed to activate tenant');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🚀 Super Admin Dashboard</h1>
          <p>fv-company.com Platform</p>
        </div>
        <button onClick={onLogout} className="btn-secondary">
          Logout
        </button>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={activeTab === 'tenants' ? 'active' : ''}
          onClick={() => setActiveTab('tenants')}
        >
          🏪 Tenants
        </button>
        <button
          className={activeTab === 'kubernetes' ? 'active' : ''}
          onClick={() => setActiveTab('kubernetes')}
        >
          ⚙️ Kubernetes
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview">
            <h2>Platform Statistics</h2>
            {statsLoading ? (
              <p>Loading stats...</p>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats?.totalTenants || 0}</div>
                  <div className="stat-label">Total Tenants</div>
                  <div className="stat-detail">
                    {stats?.activeTenants || 0} active
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-value">{stats?.totalProducts || 0}</div>
                  <div className="stat-label">Total Products</div>
                  <div className="stat-detail">Across all stores</div>
                </div>

                <div className="stat-card">
                  <div className="stat-value">{stats?.totalOrders || 0}</div>
                  <div className="stat-label">Total Orders</div>
                  <div className="stat-detail">All-time</div>
                </div>

                <div className="stat-card">
                  <div className="stat-value">${stats?.totalRevenue.toFixed(2) || '0.00'}</div>
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-detail">Lifetime</div>
                </div>

                <div className="stat-card">
                  <div className="stat-value">{stats?.totalUsers || 0}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-detail">Platform-wide</div>
                </div>

                <div className="stat-card">
                  <div className="stat-value">{pods?.length || 0}</div>
                  <div className="stat-label">Kubernetes Pods</div>
                  <div className="stat-detail">
                    {pods?.filter(p => p.status === 'Running').length || 0} running
                  </div>
                </div>
              </div>
            )}

            <div className="info-section">
              <h3>✅ Real Data - No Mocks</h3>
              <p>
                All statistics are fetched directly from PostgreSQL database and Kubernetes API.
                This dashboard uses React + TypeScript with real-time data fetching.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="tenants">
            <h2>Tenant Management</h2>
            {tenantsLoading ? (
              <p>Loading tenants...</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Store Name</th>
                      <th>Subdomain</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants?.map((tenant) => (
                      <tr key={tenant.id}>
                        <td>{tenant.id}</td>
                        <td>{tenant.store_name}</td>
                        <td>
                          <a
                            href={`https://${tenant.subdomain}.fv-company.com`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {tenant.subdomain}.fv-company.com
                          </a>
                        </td>
                        <td>
                          <span className={`status-badge ${tenant.status}`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                        <td>
                          {tenant.status === 'active' ? (
                            <button
                              onClick={() => handleSuspendTenant(tenant.id)}
                              className="btn-danger-sm"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateTenant(tenant.id)}
                              className="btn-success-sm"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tenants?.length && <p className="empty-state">No tenants yet</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kubernetes' && (
          <div className="kubernetes">
            <h2>Kubernetes Pod Monitoring</h2>
            <p className="info">Real-time pod statistics from kubectl (refreshes every 5 seconds)</p>
            {podsLoading ? (
              <p>Loading pod stats...</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Pod Name</th>
                      <th>Status</th>
                      <th>Restarts</th>
                      <th>Age</th>
                      <th>CPU</th>
                      <th>Memory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pods?.map((pod) => (
                      <tr key={pod.name}>
                        <td><code>{pod.name}</code></td>
                        <td>
                          <span className={`status-badge ${pod.status === 'Running' ? 'active' : 'suspended'}`}>
                            {pod.status}
                          </span>
                        </td>
                        <td>{pod.restarts}</td>
                        <td>{pod.age}</td>
                        <td>{pod.cpu}</td>
                        <td>{pod.memory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!pods?.length && <p className="empty-state">No pods found</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('admin_token')
  );

  const handleLogin = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard token={token} onLogout={handleLogout} />
      )}
    </QueryClientProvider>
  );
}

export default App;
