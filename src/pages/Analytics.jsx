import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ChartBar as BarChart3, TrendingUp, Users, MousePointer, MessageSquare, Calendar } from 'lucide-react';

export default function Analytics() {
  const { businessProfile } = useAuth();
  const [stats, setStats] = useState({
    totalBroadcasts: 0,
    totalSent: 0,
    totalClicks: 0,
    totalContacts: 0,
  });
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessProfile) {
      fetchAnalytics();
    }
  }, [businessProfile]);

  const fetchAnalytics = async () => {
    try {
      const { data: broadcasts, error: broadcastsError } = await supabase
        .from('broadcasts')
        .select('*, contact_lists(name)')
        .eq('business_id', businessProfile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (broadcastsError) throw broadcastsError;

      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessProfile.id);

      const { count: totalBroadcasts } = await supabase
        .from('broadcasts')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessProfile.id);

      const totalSent = broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);

      const broadcastIds = broadcasts.map((b) => b.id);
      let totalClicks = 0;

      if (broadcastIds.length > 0) {
        const { data: analytics } = await supabase
          .from('message_analytics')
          .select('link_clicks')
          .in('broadcast_id', broadcastIds);

        totalClicks = analytics?.reduce((sum, a) => sum + (a.link_clicks || 0), 0) || 0;
      }

      setStats({
        totalBroadcasts: totalBroadcasts || 0,
        totalSent,
        totalClicks,
        totalContacts: contactCount || 0,
      });

      const broadcastsWithAnalytics = await Promise.all(
        broadcasts.map(async (broadcast) => {
          const { data: analytics } = await supabase
            .from('message_analytics')
            .select('*')
            .eq('broadcast_id', broadcast.id);

          const clicks = analytics?.reduce((sum, a) => sum + (a.link_clicks || 0), 0) || 0;
          const delivered = analytics?.filter((a) => a.delivered).length || 0;

          return {
            ...broadcast,
            clicks,
            delivered,
            clickRate: broadcast.sent_count > 0 ? (clicks / broadcast.sent_count) * 100 : 0,
            deliveryRate:
              broadcast.sent_count > 0 ? (delivered / broadcast.sent_count) * 100 : 0,
          };
        })
      );

      setRecentBroadcasts(broadcastsWithAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Track your broadcast performance and engagement</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Total Broadcasts"
          value={stats.totalBroadcasts}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Messages Sent"
          value={stats.totalSent}
          color="green"
        />
        <StatCard
          icon={MousePointer}
          label="Total Clicks"
          value={stats.totalClicks}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Contacts"
          value={stats.totalContacts}
          color="orange"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            Recent Broadcast Performance
          </h2>
        </div>

        {recentBroadcasts.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No completed broadcasts</h3>
            <p className="text-gray-600">
              Analytics will appear here once you complete your first broadcast
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Broadcast
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Sent
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Delivered
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Clicks
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Click Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBroadcasts.map((broadcast) => (
                  <tr key={broadcast.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {broadcast.contact_lists?.name || 'Unknown List'}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {broadcast.message.substring(0, 50)}
                          {broadcast.message.length > 50 ? '...' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {format(new Date(broadcast.completed_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">{broadcast.sent_count}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>
                        <span className="font-medium text-gray-900">{broadcast.delivered}</span>
                        <span className="text-sm text-gray-500 ml-1">
                          ({broadcast.deliveryRate.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">{broadcast.clicks}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                          broadcast.clickRate > 5
                            ? 'bg-green-100 text-green-800'
                            : broadcast.clickRate > 2
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {broadcast.clickRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
