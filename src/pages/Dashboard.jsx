import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Users,
  List,
  MessageSquare,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { businessProfile } = useAuth();
  const [stats, setStats] = useState({
    contacts: 0,
    lists: 0,
    broadcasts: 0,
    scheduled: 0,
  });
  const [upcomingBroadcasts, setUpcomingBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessProfile) {
      fetchDashboardData();
    }
  }, [businessProfile]);

  const fetchDashboardData = async () => {
    try {
      const [contactsRes, listsRes, broadcastsRes, upcomingRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessProfile.id),
        supabase
          .from('contact_lists')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessProfile.id),
        supabase
          .from('broadcasts')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessProfile.id),
        supabase
          .from('broadcasts')
          .select('*, contact_lists(name)')
          .eq('business_id', businessProfile.id)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(5),
      ]);

      const scheduledCount = await supabase
        .from('broadcasts')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessProfile.id)
        .eq('status', 'scheduled');

      setStats({
        contacts: contactsRes.count || 0,
        lists: listsRes.count || 0,
        broadcasts: broadcastsRes.count || 0,
        scheduled: scheduledCount.count || 0,
      });

      setUpcomingBroadcasts(upcomingRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {businessProfile.business_name}
        </h1>
        <p className="text-gray-600 mt-1">Here's your WhatsApp broadcast overview</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Contacts"
          value={stats.contacts}
          link="/contacts"
          color="blue"
        />
        <StatCard
          icon={List}
          label="Contact Lists"
          value={stats.lists}
          link="/lists"
          color="green"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Broadcasts"
          value={stats.broadcasts}
          link="/broadcasts"
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Scheduled"
          value={stats.scheduled}
          link="/broadcasts"
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-600" />
              Upcoming Broadcasts
            </h2>
          </div>
          <div className="p-6">
            {upcomingBroadcasts.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No scheduled broadcasts</p>
                <Link
                  to="/broadcasts"
                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                  Schedule a broadcast
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBroadcasts.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {broadcast.contact_lists?.name || 'Unknown List'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {broadcast.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(broadcast.scheduled_at), 'MMM dd, yyyy hh:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link
                  to="/broadcasts"
                  className="block text-center text-green-600 hover:text-green-700 font-medium text-sm pt-2"
                >
                  View all broadcasts
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link
                to="/contacts"
                className="block p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Add Contact</p>
                      <p className="text-sm text-gray-600">Grow your contact list</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/lists"
                className="block p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <List className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create List</p>
                      <p className="text-sm text-gray-600">Segment your audience</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/broadcasts"
                className="block p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Schedule Broadcast</p>
                      <p className="text-sm text-gray-600">Send messages to your lists</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/analytics"
                className="block p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">View Analytics</p>
                      <p className="text-sm text-gray-600">Track performance</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, link, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Link
      to={link}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Link>
  );
}
