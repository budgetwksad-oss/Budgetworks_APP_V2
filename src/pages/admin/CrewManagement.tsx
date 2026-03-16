import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserPlus, Search, Mail, Phone, Calendar, Briefcase, Clock, CheckCircle, X, CreditCard as Edit2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CrewMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  can_drive: boolean;
  created_at: string;
}

interface CrewStats {
  total_jobs: number;
  completed_jobs: number;
  total_hours: number;
  active_jobs: number;
}

interface CrewDetail extends CrewMember {
  stats: CrewStats;
  recent_jobs: Array<{
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string;
    role: string;
  }>;
}

export function CrewManagement({ onBack }: { onBack: () => void }) {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [filteredCrew, setFilteredCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrew, setSelectedCrew] = useState<CrewDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingQualifications, setEditingQualifications] = useState(false);
  const [canDrive, setCanDrive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadCrewMembers();
  }, []);

  useEffect(() => {
    const filtered = crewMembers.filter(crew =>
      crew.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.phone?.includes(searchTerm)
    );
    setFilteredCrew(filtered);
  }, [searchTerm, crewMembers]);

  const loadCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, can_drive, created_at')
        .eq('role', 'crew')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCrewMembers(data || []);
      setFilteredCrew(data || []);
    } catch (err: any) {
      console.error('Error loading crew members:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewDetails = async (crewId: string) => {
    setLoadingDetails(true);
    try {
      const crew = crewMembers.find(c => c.id === crewId);
      if (!crew) return;

      setCanDrive(crew.can_drive || false);

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, service_type, status, scheduled_date, crew_assignments')
        .contains('assigned_crew_ids', [crewId]);

      if (jobsError) throw jobsError;

      const crewJobs = (jobs || []).map(job => {
        const assignments = Array.isArray(job.crew_assignments) ? job.crew_assignments : [];
        const assignment = assignments.find((a: any) => a.user_id === crewId);
        return {
          ...job,
          role: assignment?.role || 'helper'
        };
      });

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('hours_worked')
        .eq('crew_member_id', crewId)
        .not('clock_out', 'is', null);

      if (timeError) throw timeError;

      const totalHours = (timeEntries || []).reduce((sum, entry) => {
        return sum + (entry.hours_worked || 0);
      }, 0);

      const completedJobs = crewJobs.filter(j => j.status === 'completed').length;
      const activeJobs = crewJobs.filter(j => ['scheduled', 'in_progress'].includes(j.status)).length;

      setSelectedCrew({
        ...crew,
        stats: {
          total_jobs: crewJobs.length,
          completed_jobs: completedJobs,
          total_hours: Math.round(totalHours * 10) / 10,
          active_jobs: activeJobs
        },
        recent_jobs: crewJobs.slice(0, 10)
      });
    } catch (err: any) {
      console.error('Error loading crew details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveQualifications = async () => {
    if (!selectedCrew) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ can_drive: canDrive })
        .eq('id', selectedCrew.id);

      if (error) throw error;

      setCrewMembers(prev =>
        prev.map(c => (c.id === selectedCrew.id ? { ...c, can_drive: canDrive } : c))
      );

      setSelectedCrew(prev => prev ? { ...prev, can_drive: canDrive } : null);
      setEditingQualifications(false);
    } catch (err: any) {
      console.error('Error updating qualifications:', err);
      showToast('error', 'Failed to update qualifications');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getRoleBadge = (role: string) => {
    return role === 'driver'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading crew members...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (selectedCrew && !loadingDetails) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Crew', onClick: () => setSelectedCrew(null) },
          { label: selectedCrew.full_name }
        ]}
      >
        <div className="space-y-6">
          {toast && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCrew.full_name}</h2>
              <p className="text-gray-600 mt-1">Crew member details and performance</p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedCrew(null)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCrew.stats.total_jobs}</p>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCrew.stats.completed_jobs}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCrew.stats.total_hours}h</p>
                  <p className="text-sm text-gray-600">Total Hours</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCrew.stats.active_jobs}</p>
                  <p className="text-sm text-gray-600">Active Jobs</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{selectedCrew.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{selectedCrew.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedCrew.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Qualifications</h3>
              {!editingQualifications ? (
                <Button variant="secondary" size="sm" onClick={() => setEditingQualifications(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingQualifications(false);
                      setCanDrive(selectedCrew.can_drive || false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveQualifications}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Can Drive</p>
                  <p className="text-sm text-gray-600">Qualified to drive company vehicles</p>
                </div>
                {editingQualifications ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDrive}
                      onChange={(e) => setCanDrive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCrew.can_drive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {selectedCrew.can_drive ? 'Yes' : 'No'}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job History</h3>
            {selectedCrew.recent_jobs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No jobs found</p>
            ) : (
              <div className="space-y-3">
                {selectedCrew.recent_jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {job.service_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadge(job.role)}`}>
                        {job.role}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Crew' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Crew Management
            </h2>
            <p className="text-gray-600 mt-1">View and manage crew members</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              All Crew Members ({filteredCrew.length})
            </h3>
          </div>

          {filteredCrew.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No crew members found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search' : 'Crew members will appear here once they sign up'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Can Drive</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrew.map((crew) => (
                    <tr key={crew.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{crew.full_name || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{crew.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{crew.phone || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            crew.can_drive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {crew.can_drive ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{new Date(crew.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => loadCrewDetails(crew.id)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PortalLayout>
  );
}
