export const demoIncidents = [
  {
    id: '1',
    title: 'Database Connection Timeout',
    description: 'Primary database experiencing connection timeouts affecting user authentication',
    severity: 'critical' as const,
    status: 'open' as const,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'High Memory Usage on Web Servers',
    description: 'Memory usage has exceeded 85% on production web servers',
    severity: 'high' as const,
    status: 'acknowledged' as const,
    assigned_to: 'John Smith',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'SSL Certificate Expiry Warning',
    description: 'SSL certificate for api.example.com expires in 7 days',
    severity: 'medium' as const,
    status: 'resolved' as const,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
  },
];

export const demoUser = {
  id: '1',
  email: 'demo@offcallai.com',
  name: 'Demo User',
  role: 'admin',
  organization_id: '1',
  is_active: true,
  created_at: new Date().toISOString(),
};
