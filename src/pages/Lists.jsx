import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit2, X, Users, UserPlus } from 'lucide-react';

export default function Lists() {
  const { businessProfile } = useAuth();
  const [lists, setLists] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showListModal, setShowListModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [listContacts, setListContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (businessProfile) {
      fetchLists();
      fetchContacts();
    }
  }, [businessProfile]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('business_id', businessProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('business_id', businessProfile.id)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchListContacts = async (listId) => {
    try {
      const { data, error } = await supabase
        .from('list_contacts')
        .select('contact_id, contacts(*)')
        .eq('list_id', listId);

      if (error) throw error;
      setListContacts(data.map((item) => item.contacts));
    } catch (error) {
      console.error('Error fetching list contacts:', error);
    }
  };

  const getListContactCount = async (listId) => {
    const { count } = await supabase
      .from('list_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);
    return count || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingList) {
        const { error } = await supabase
          .from('contact_lists')
          .update({
            name: formData.name,
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingList.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('contact_lists').insert({
          business_id: businessProfile.id,
          name: formData.name,
          description: formData.description,
        });

        if (error) throw error;
      }

      await fetchLists();
      closeListModal();
    } catch (error) {
      console.error('Error saving list:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return;

    try {
      const { error } = await supabase.from('contact_lists').delete().eq('id', id);
      if (error) throw error;
      await fetchLists();
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleAddContact = async (contactId) => {
    try {
      const { error } = await supabase.from('list_contacts').insert({
        list_id: selectedList.id,
        contact_id: contactId,
      });

      if (error) throw error;
      await fetchListContacts(selectedList.id);
    } catch (error) {
      if (error.code === '23505') {
        alert('Contact already in this list');
      } else {
        console.error('Error adding contact:', error);
      }
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      const { error } = await supabase
        .from('list_contacts')
        .delete()
        .eq('list_id', selectedList.id)
        .eq('contact_id', contactId);

      if (error) throw error;
      await fetchListContacts(selectedList.id);
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const openListModal = () => {
    setEditingList(null);
    setFormData({ name: '', description: '' });
    setShowListModal(true);
  };

  const openEditModal = (list) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
    });
    setShowListModal(true);
  };

  const closeListModal = () => {
    setShowListModal(false);
    setEditingList(null);
    setFormData({ name: '', description: '' });
  };

  const openContactsModal = async (list) => {
    setSelectedList(list);
    await fetchListContacts(list.id);
    setShowContactsModal(true);
  };

  const closeContactsModal = () => {
    setShowContactsModal(false);
    setSelectedList(null);
    setListContacts([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading lists...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Lists</h1>
          <p className="text-gray-600 mt-1">Segment your audience for targeted broadcasts</p>
        </div>
        <button
          onClick={openListModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
          <p className="text-gray-600 mb-4">
            Create lists to segment your contacts for targeted broadcasts
          </p>
          <button
            onClick={openListModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Create List
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onManageContacts={openContactsModal}
              getContactCount={getListContactCount}
            />
          ))}
        </div>
      )}

      {showListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingList ? 'Edit List' : 'Create List'}
              </h2>
              <button onClick={closeListModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VIP Customers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Description of this list..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeListModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingList ? 'Update' : 'Create'} List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContactsModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Contacts: {selectedList.name}
              </h2>
              <button onClick={closeContactsModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Contacts in List ({listContacts.length})
                </h3>
                {listContacts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No contacts in this list yet</p>
                ) : (
                  <div className="space-y-2">
                    {listContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveContact(contact.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Contacts</h3>
                <div className="space-y-2">
                  {contacts
                    .filter((c) => !listContacts.find((lc) => lc.id === c.id))
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                        </div>
                        <button
                          onClick={() => handleAddContact(contact.id)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {contacts.filter((c) => !listContacts.find((lc) => lc.id === c.id))
                    .length === 0 && (
                    <p className="text-gray-500 text-sm">All contacts are in this list</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({ list, onEdit, onDelete, onManageContacts, getContactCount }) {
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    getContactCount(list.id).then(setContactCount);
  }, [list.id]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
          {list.description && (
            <p className="text-gray-600 text-sm mt-1">{list.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(list)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(list.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">{contactCount} contacts</span>
        </div>
        <button
          onClick={() => onManageContacts(list)}
          className="text-green-600 hover:text-green-700 text-sm font-medium"
        >
          Manage
        </button>
      </div>
    </div>
  );
}
