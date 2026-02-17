import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Settings as SettingsIcon, Save, Building2, Mail, Phone, MapPin, Bell } from 'lucide-react';
import { supabase, getNotificationPreference, upsertNotificationPreference, NotificationPreference } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsTemplates } from './NotificationsTemplates';

interface CompanySettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  tax_rate: number;
  invoice_terms: string;
  invoice_footer: string;
}

interface SettingsProps {
  onBack: () => void;
}

type SettingsTab = 'company' | 'notifications';

export function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Service Company',
    company_email: 'info@servicecompany.com',
    company_phone: '(555) 123-4567',
    company_address: '123 Business St, City, State 12345',
    tax_rate: 0.08,
    invoice_terms: 'Payment due within 30 days',
    invoice_footer: 'Thank you for your business!'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState('');

  useEffect(() => {
    loadSettings();
    loadNotificationPreferences();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          company_name: data.business_name || 'Service Company',
          company_email: data.email || 'info@servicecompany.com',
          company_phone: data.phone || '(555) 123-4567',
          company_address: data.address || '123 Business St, City, State 12345',
          tax_rate: data.tax_rate || 0.14,
          invoice_terms: data.invoice_terms || 'Payment due within 30 days',
          invoice_footer: data.invoice_footer || 'Thank you for your business!'
        });
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationPreferences = async () => {
    if (!user) return;

    setNotifLoading(true);
    try {
      const { data } = await getNotificationPreference(user.id, 'admin');
      setNotificationPrefs(data);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotificationToggle = async (field: 'sms_enabled' | 'email_enabled', value: boolean) => {
    if (!user) return;

    const optimisticUpdate = {
      ...notificationPrefs,
      [field]: value
    } as NotificationPreference;
    setNotificationPrefs(optimisticUpdate);

    try {
      const { data, error: updateError } = await upsertNotificationPreference(
        user.id,
        'admin',
        { [field]: value }
      );

      if (updateError) throw updateError;
      if (data) setNotificationPrefs(data);
    } catch (err: any) {
      setNotificationPrefs(notificationPrefs);
      setNotifError(err.message || 'Failed to update notification preferences');
      setTimeout(() => setNotifError(''), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .maybeSingle();

      const settingsData = {
        business_name: settings.company_name,
        email: settings.company_email,
        phone: settings.company_phone,
        address: settings.company_address,
        tax_rate: settings.tax_rate,
        invoice_terms: settings.invoice_terms,
        invoice_footer: settings.invoice_footer
      };

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update(settingsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      alert('Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Settings' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="w-8 h-8 text-blue-600" />
              System Settings
            </h2>
            <p className="text-gray-600 mt-1">Manage company information and defaults</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('company')}
              className={`pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Company Settings
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'notifications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Notification Templates
            </button>
          </nav>
        </div>

        {activeTab === 'notifications' ? (
          <NotificationsTemplates />
        ) : (
          <>
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Company Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <Input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  placeholder="info@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Company Address
              </label>
              <Input
                type="text"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                placeholder="123 Business St, City, State 12345"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Invoice Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Tax Rate (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.tax_rate * 100}
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) / 100 })}
                placeholder="8.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current rate: {(settings.tax_rate * 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <Input
                type="text"
                value={settings.invoice_terms}
                onChange={(e) => setSettings({ ...settings, invoice_terms: e.target.value })}
                placeholder="Payment due within 30 days"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Footer Text
              </label>
              <textarea
                value={settings.invoice_footer}
                onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Thank you for your business!"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notifications (Operational)
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Important operational updates only. No marketing.
          </p>
          {notifError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{notifError}</p>
            </div>
          )}
          {notifLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Receive text message updates</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle('sms_enabled', !notificationPrefs?.sms_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationPrefs?.sms_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs?.sms_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive email updates</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle('email_enabled', !notificationPrefs?.email_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationPrefs?.email_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs?.email_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
