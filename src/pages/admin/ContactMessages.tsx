import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Mail, Phone, Clock, CheckCircle, Archive, Inbox, RefreshCw, AlertCircle } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  created_at: string;
}

const STATUS_LABELS: Record<ContactMessage['status'], string> = {
  new: 'New',
  read: 'Read',
  responded: 'Responded',
  archived: 'Archived',
};

const STATUS_COLORS: Record<ContactMessage['status'], string> = {
  new: 'bg-orange-100 text-orange-700 border-orange-200',
  read: 'bg-blue-50 text-blue-700 border-blue-200',
  responded: 'bg-green-50 text-green-700 border-green-200',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContactMessage['status'] | 'all'>('all');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError('Failed to load messages.');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: ContactMessage['status']) => {
    setUpdating(true);
    const { error: err } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id);

    if (!err) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    }
    setUpdating(false);
  };

  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter(m => m.status === filter);

  const newCount = messages.filter(m => m.status === 'new').length;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-CA', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-500" />
            Contact Messages
            {newCount > 0 && (
              <span className="text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                {newCount} new
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Messages submitted through the contact form</p>
        </div>
        <Button variant="secondary" onClick={loadMessages} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'new', 'read', 'responded', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s === 'all' ? `All (${messages.length})` : `${STATUS_LABELS[s]} (${messages.filter(m => m.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No messages to show</p>
            </div>
          ) : (
            filteredMessages.map(msg => (
              <div
                key={msg.id}
                onClick={() => {
                  setSelected(msg);
                  if (msg.status === 'new') updateStatus(msg.id, 'read');
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selected?.id === msg.id
                    ? 'border-orange-400 bg-orange-50'
                    : msg.status === 'new'
                    ? 'border-orange-200 bg-orange-50/50 hover:border-orange-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{msg.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_COLORS[msg.status]}`}>
                        {STATUS_LABELS[msg.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{msg.email}</p>
                    {msg.subject && (
                      <p className="text-xs font-medium text-gray-700 mt-1 truncate">{msg.subject}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{msg.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{fmtDate(msg.created_at)}</p>
                    <p className="text-xs text-gray-400">{fmtTime(msg.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <Card className="p-6 sticky top-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 text-right">
                  {fmtDate(selected.created_at)}<br />{fmtTime(selected.created_at)}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600 transition-colors"
                >
                  <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {selected.email}
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    {selected.phone}
                  </a>
                )}
                {selected.subject && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{selected.subject}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Reply by Email
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                {selected.status !== 'responded' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={updating}
                    onClick={() => updateStatus(selected.id, 'responded')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Mark Responded
                  </Button>
                )}
                {selected.status !== 'archived' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updating}
                    onClick={() => {
                      updateStatus(selected.id, 'archived');
                      setSelected(null);
                    }}
                  >
                    <Archive className="w-4 h-4 mr-1.5" />
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-48 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Select a message to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
