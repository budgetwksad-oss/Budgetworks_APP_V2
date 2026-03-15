import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Bell, Plus, CreditCard as Edit2, X, Check } from 'lucide-react';
import {
  getNotificationTemplatesV2,
  upsertNotificationTemplateV2,
  NotificationTemplateV2,
  NotificationEventKey,
  NotificationAudience,
  ServiceType
} from '../../lib/supabase';

const EVENT_LABELS: Record<NotificationEventKey, string> = {
  lead_received: 'Lead Received (Admin)',
  quote_sent: 'Quote Sent (Customer)',
  quote_accepted: 'Quote Accepted (Admin + Customer)',
  quote_declined: 'Quote Declined (Admin)',
  job_scheduled: 'Job Scheduled (Customer + Crew)',
  job_cancelled: 'Job Cancelled (Customer + Crew + Admin)',
  job_claimed: 'Job Claimed (Admin)',
  invoice_sent: 'Invoice Sent (Customer)',
  payment_received: 'Payment Received (Customer + Admin)'
};

const DEFAULT_TEMPLATES: Array<{
  event_key: NotificationEventKey;
  audience: NotificationAudience;
  subject: string;
  body: string;
}> = [
  {
    event_key: 'lead_received',
    audience: 'admin',
    subject: 'New Lead: {service_label}',
    body: 'New quote request from {customer_name} for {service_label}. Review and respond promptly.'
  },
  {
    event_key: 'quote_sent',
    audience: 'customer',
    subject: 'Your Quote is Ready',
    body: 'Hi {customer_name}, your quote for {service_label} is ready. Review it here: {quote_link}'
  },
  {
    event_key: 'quote_accepted',
    audience: 'customer',
    subject: 'Quote Accepted - Thank You!',
    body: 'Thank you {customer_name} for accepting our quote for {service_label}. We will contact you shortly to schedule.'
  },
  {
    event_key: 'quote_accepted',
    audience: 'admin',
    subject: 'Quote Accepted: {service_label}',
    body: '{customer_name} accepted the quote for {service_label} ({range}). Schedule the job.'
  },
  {
    event_key: 'quote_declined',
    audience: 'admin',
    subject: 'Quote Declined: {service_label}',
    body: '{customer_name} declined the quote for {service_label}.'
  },
  {
    event_key: 'job_scheduled',
    audience: 'customer',
    subject: 'Job Scheduled: {service_label}',
    body: 'Your {service_label} job is scheduled for {job_date}. Arrival window: {arrival_window}. Questions? Call {company_phone}'
  },
  {
    event_key: 'job_scheduled',
    audience: 'crew',
    subject: 'New Job Assignment: {service_label}',
    body: 'You have been assigned to a {service_label} job on {job_date}. Arrival window: {arrival_window}.'
  },
  {
    event_key: 'job_cancelled',
    audience: 'customer',
    subject: 'Job Cancelled',
    body: 'Your {service_label} job scheduled for {job_date} has been cancelled. Contact us at {company_phone} for details.'
  },
  {
    event_key: 'job_cancelled',
    audience: 'crew',
    subject: 'Job Cancelled: {service_label}',
    body: 'The {service_label} job on {job_date} has been cancelled. Check your schedule for updates.'
  },
  {
    event_key: 'job_cancelled',
    audience: 'admin',
    subject: 'Job Cancelled: {service_label}',
    body: 'Job for {customer_name} on {job_date} has been cancelled.'
  },
  {
    event_key: 'job_claimed',
    audience: 'admin',
    subject: 'Job Claimed: {service_label}',
    body: 'A crew member has claimed the {service_label} job on {job_date}.'
  },
  {
    event_key: 'invoice_sent',
    audience: 'customer',
    subject: 'Invoice for {service_label}',
    body: 'Hi {customer_name}, your invoice for {service_label} is ready. Total: {invoice_total}. View: {invoice_link}'
  },
  {
    event_key: 'payment_received',
    audience: 'customer',
    subject: 'Payment Received - Thank You!',
    body: 'Thank you {customer_name} for your payment of {invoice_total}. We appreciate your business!'
  },
  {
    event_key: 'payment_received',
    audience: 'admin',
    subject: 'Payment Received: {customer_name}',
    body: 'Payment of {invoice_total} received from {customer_name}.'
  }
];

interface EditModalProps {
  template: NotificationTemplateV2 | null;
  eventKey?: NotificationEventKey;
  onClose: () => void;
  onSave: (template: Partial<NotificationTemplateV2>) => void;
}

function EditModal({ template, eventKey, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState({
    event_key: template?.event_key || eventKey || 'lead_received',
    audience: template?.audience || 'customer',
    subject: template?.subject || '',
    body: template?.body || '',
    enabled: template?.enabled ?? true,
    service_type: template?.service_type || null
  });

  const handleSubmit = () => {
    if (!formData.body.trim()) {
      alert('Body is required');
      return;
    }

    onSave({
      id: template?.id,
      ...formData
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              value={formData.event_key}
              onChange={(e) => setFormData({ ...formData, event_key: e.target.value as NotificationEventKey })}
              disabled={!!template}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Audience
            </label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value as NotificationAudience })}
              disabled={!!template}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="customer">Customer</option>
              <option value="crew">Crew</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type Override (Optional)
            </label>
            <select
              value={formData.service_type || ''}
              onChange={(e) => setFormData({ ...formData, service_type: (e.target.value || null) as ServiceType | null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Services</option>
              <option value="moving">Moving</option>
              <option value="junk_removal">Junk Removal</option>
              <option value="demolition">Demolition</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject (Email Only)
            </label>
            <Input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Email subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body (SMS & Email)
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Message body..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Available placeholders: {'{customer_name}'} {'{service_label}'} {'{range}'} {'{quote_link}'} {'{job_date}'} {'{arrival_window}'} {'{company_phone}'} {'{invoice_total}'} {'{invoice_link}'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              Template Enabled
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            <Check className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplateV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateV2 | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await getNotificationTemplatesV2();
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (template: Partial<NotificationTemplateV2>) => {
    setSaving(true);
    try {
      const { data: _data, error } = await upsertNotificationTemplateV2(template);
      if (error) throw error;

      await loadTemplates();
      setEditingTemplate(null);
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Error saving template:', err);
      alert('Failed to save template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (template: NotificationTemplateV2) => {
    try {
      await upsertNotificationTemplateV2({
        id: template.id,
        enabled: !template.enabled
      });
      await loadTemplates();
    } catch (err: any) {
      console.error('Error toggling template:', err);
      alert('Failed to update template: ' + err.message);
    }
  };

  const seedDefaults = async () => {
    if (!confirm('This will create default templates for all events. Continue?')) {
      return;
    }

    setSaving(true);
    try {
      for (const template of DEFAULT_TEMPLATES) {
        await upsertNotificationTemplateV2(template);
      }
      await loadTemplates();
      alert('Default templates created successfully');
    } catch (err: any) {
      console.error('Error seeding templates:', err);
      alert('Failed to create templates: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.event_key]) {
      acc[template.event_key] = [];
    }
    acc[template.event_key].push(template);
    return acc;
  }, {} as Record<NotificationEventKey, NotificationTemplateV2[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notification Templates
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage automated notification messages for operational events
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="secondary" onClick={seedDefaults} disabled={saving}>
              Seed Defaults
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
          <p className="text-gray-600 mb-4">
            Create notification templates to automate operational communications
          </p>
          <Button variant="primary" onClick={seedDefaults} disabled={saving}>
            Seed Default Templates
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(EVENT_LABELS).map(([eventKey, label]) => {
            const eventTemplates = groupedTemplates[eventKey as NotificationEventKey] || [];

            return (
              <Card key={eventKey} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{label}</h4>
                  <span className="text-sm text-gray-500">
                    {eventTemplates.length} template{eventTemplates.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {eventTemplates.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No templates configured</p>
                ) : (
                  <div className="space-y-2">
                    {eventTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-700 uppercase bg-gray-200 px-2 py-0.5 rounded">
                              {template.audience}
                            </span>
                            {template.service_type && (
                              <span className="text-xs text-gray-600 bg-blue-100 px-2 py-0.5 rounded">
                                {template.service_type.replace('_', ' ')}
                              </span>
                            )}
                            {!template.enabled && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                          {template.subject && (
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {template.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {template.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleToggleEnabled(template)}
                            className={`p-2 rounded-lg transition-colors ${
                              template.enabled
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title={template.enabled ? 'Enabled' : 'Disabled'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {(editingTemplate || showCreateModal) && (
        <EditModal
          template={editingTemplate}
          onClose={() => {
            setEditingTemplate(null);
            setShowCreateModal(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
