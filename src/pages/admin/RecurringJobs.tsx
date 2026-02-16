import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RefreshCw, Plus, X, Edit2, Trash2, Calendar, MapPin, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface RecurringJob {
  id: string;
  customer_id: string;
  service_type: string;
  location_address: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  time_of_day: string | null;
  assigned_crew_ids: string[];
  line_items: any[];
  notes: string;
  is_active: boolean;
  last_generated_date: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function RecurringJobs({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [recurringJobs, setRecurringJobs] = useState<RecurringJob[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<RecurringJob | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: 'moving',
    location_address: '',
    frequency: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    time_of_day: '09:00',
    assigned_crew_ids: [] as string[],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsRes, customersRes, crewRes] = await Promise.all([
        supabase
          .from('recurring_jobs')
          .select(`
            *,
            profiles:customer_id (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'customer')
          .order('full_name'),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'crew')
          .order('full_name')
      ]);

      setRecurringJobs(jobsRes.data || []);
      setCustomers(customersRes.data || []);
      setCrew(crewRes.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      alert('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.location_address) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        ...formData,
        day_of_week: formData.frequency === 'weekly' || formData.frequency === 'biweekly' ? formData.day_of_week : null,
        day_of_month: formData.frequency === 'monthly' || formData.frequency === 'quarterly' ? formData.day_of_month : null,
        end_date: formData.end_date || null,
        time_of_day: formData.time_of_day || null,
        created_by: user?.id
      };

      if (editingJob) {
        const { error } = await supabase
          .from('recurring_jobs')
          .update(data)
          .eq('id', editingJob.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_jobs')
          .insert(data);

        if (error) throw error;
      }

      await loadData();
      setShowModal(false);
      setEditingJob(null);
      resetForm();
    } catch (err: any) {
      console.error('Error saving recurring job:', err);
      alert('Failed to save recurring job: ' + err.message);
    }
  };

  const handleEdit = (job: RecurringJob) => {
    setEditingJob(job);
    setFormData({
      customer_id: job.customer_id,
      service_type: job.service_type,
      location_address: job.location_address,
      frequency: job.frequency,
      day_of_week: job.day_of_week || 1,
      day_of_month: job.day_of_month || 1,
      start_date: job.start_date,
      end_date: job.end_date || '',
      time_of_day: job.time_of_day || '09:00',
      assigned_crew_ids: job.assigned_crew_ids || [],
      notes: job.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring job? This will not affect jobs that have already been generated.')) return;

    try {
      const { error } = await supabase
        .from('recurring_jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error deleting recurring job:', err);
      alert('Failed to delete recurring job: ' + err.message);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_jobs')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error toggling recurring job:', err);
      alert('Failed to toggle recurring job: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      service_type: 'moving',
      location_address: '',
      frequency: 'weekly',
      day_of_week: 1,
      day_of_month: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      time_of_day: '09:00',
      assigned_crew_ids: [],
      notes: ''
    });
  };

  const getFrequencyDescription = (job: RecurringJob) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    switch (job.frequency) {
      case 'weekly':
        return `Every ${days[job.day_of_week || 0]}`;
      case 'biweekly':
        return `Every other ${days[job.day_of_week || 0]}`;
      case 'monthly':
        return `Monthly on day ${job.day_of_month}`;
      case 'quarterly':
        return `Quarterly on day ${job.day_of_month}`;
      default:
        return job.frequency;
    }
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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
        { label: 'Recurring Jobs' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Recurring Jobs
            </h2>
            <p className="text-gray-600 mt-1">Manage automatically scheduled recurring jobs</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setEditingJob(null);
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Recurring Job
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-900 font-medium">How Recurring Jobs Work</p>
              <p className="text-sm text-blue-700 mt-1">
                Recurring jobs automatically generate new job entries based on the schedule you set.
                Jobs are generated in advance so you can assign crew and manage scheduling.
                You can pause or stop recurring jobs at any time.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All Recurring Jobs ({recurringJobs.length})
          </h3>

          {recurringJobs.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recurring jobs</h3>
              <p className="text-gray-600 mb-4">
                Create your first recurring job to automate scheduling
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setEditingJob(null);
                  setShowModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Recurring Job
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    job.is_active
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {job.service_type.replace('_', ' ')}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            job.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {job.is_active ? 'Active' : 'Paused'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                          {getFrequencyDescription(job)}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{job.profiles?.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Starts: {new Date(job.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        {job.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Ends: {new Date(job.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {job.last_generated_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last generated: {new Date(job.last_generated_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(job.id, job.is_active)}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          job.is_active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {job.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingJob ? 'Edit Recurring Job' : 'New Recurring Job'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingJob(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Customer"
                type="select"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} ({customer.email})
                  </option>
                ))}
              </Input>

              <Input
                label="Service Type"
                type="select"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                required
              >
                <option value="moving">Moving</option>
                <option value="junk_removal">Junk Removal</option>
                <option value="demolition">Demolition</option>
              </Input>

              <Input
                label="Location Address"
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                required
              />

              <Input
                label="Frequency"
                type="select"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                required
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly (Every 2 weeks)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Input>

              {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
                <Input
                  label="Day of Week"
                  type="select"
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  required
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </Input>
              )}

              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                <Input
                  label="Day of Month"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                  required
                />
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />

                <Input
                  label="End Date (Optional)"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <Input
                label="Preferred Time"
                type="time"
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Crew Assignment
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {crew.map((member) => (
                    <label key={member.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.assigned_crew_ids.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assigned_crew_ids: [...formData.assigned_crew_ids, member.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              assigned_crew_ids: formData.assigned_crew_ids.filter(id => id !== member.id)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{member.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Notes"
                type="textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingJob ? 'Update Recurring Job' : 'Create Recurring Job'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingJob(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
