import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import {
  Plus,
  Calendar,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  MessageSquare,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'gray' },
  scheduled: { label: 'Scheduled', icon: Calendar, color: 'blue' },
  sending: { label: 'Sending', icon: Loader2, color: 'yellow' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'green' },
  failed: { label: 'Failed', icon: XCircle, color: 'red' },
};

export default function Broadcasts() {
  const { businessProfile } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [lists, setLists] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    listId: '',
    message: '',
    scheduledDate: '',
    scheduledTime: '',
  });

  useEffect(() => {
    if (businessProfile) {
      fetchBroadcasts();
      fetchLists();
    }
  }, [businessProfile]);

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*, contact_lists(name)')
        .eq('business_id', businessProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('business_id', businessProfile.id)
        .order('name');

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const scheduledAt = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}`
    );

    try {
      const { error } = await supabase.from('broadcasts').insert({
        business_id: businessProfile.id,
        list_id: formData.listId,
        message: formData.message,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      });

      if (error) throw error;
      await fetchBroadcasts();
      closeModal();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this broadcast?')) return;

    try {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw error;
      await fetchBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
    }
  };

  const openCreateModal = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setFormData({
      listId: '',
      message: '',
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: '10:00',
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setFormData({
      listId: '',
      message: '',
      scheduledDate: '',
      scheduledTime: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading broadcasts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-600 mt-1">Schedule and manage your WhatsApp broadcasts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          disabled={lists.length === 0}
        >
          <Plus className="w-5 h-5" />
          New Broadcast
        </button>
      </div>

      {lists.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Create a contact list first before scheduling broadcasts.
          </p>
        </div>
      )}

      {broadcasts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No broadcasts yet</h3>
          <p className="text-gray-600 mb-4">
            Schedule your first broadcast to reach your customers
          </p>
          {lists.length > 0 && (
            <button
              onClick={openCreateModal}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              New Broadcast
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {broadcasts.map((broadcast) => {
            const statusInfo = STATUS_CONFIG[broadcast.status];
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={broadcast.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-700`}
                      >
                        <StatusIcon className={`w-4 h-4 ${broadcast.status === 'sending' ? 'animate-spin' : ''}`} />
                        {statusInfo.label}
                      </span>
                      <span className="text-gray-600 text-sm">
                        to {broadcast.contact_lists?.name || 'Unknown List'}
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{broadcast.message}</p>
                  </div>
                  {broadcast.status === 'draft' || broadcast.status === 'scheduled' ? (
                    <button
                      onClick={() => handleDelete(broadcast.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(broadcast.scheduled_at), 'MMM dd, yyyy hh:mm a')}
                    </div>
                    {broadcast.status === 'completed' && (
                      <div className="flex items-center gap-4">
                        <span className="text-green-600">
                          {broadcast.sent_count} sent
                        </span>
                        {broadcast.failed_count > 0 && (
                          <span className="text-red-600">
                            {broadcast.failed_count} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-500">
                    Created {format(new Date(broadcast.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Schedule Broadcast</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select List
                </label>
                <select
                  value={formData.listId}
                  onChange={(e) => setFormData({ ...formData, listId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose a list...</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Type your message here..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.message.length} characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledDate: e.target.value })
                    }
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledTime: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Schedule Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
