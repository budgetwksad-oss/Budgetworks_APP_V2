import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Job, Quote, ServiceRequest, Profile, CrewAssignment } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Briefcase, Calendar, Users, Clock, MapPin, X } from 'lucide-react';

type JobWithDetails = Job & {
  quote: Quote;
  service_request: ServiceRequest;
};

interface ManageJobsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function ManageJobs({ sidebarSections, onBack }: ManageJobsProps = {}) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [crewMembers, setCrewMembers] = useState<Profile[]>([]);
  const [filterView, setFilterView] = useState<'drafts' | 'active'>('drafts');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [arrivalStart, setArrivalStart] = useState('');
  const [arrivalEnd, setArrivalEnd] = useState('');
  const [driversNeeded, setDriversNeeded] = useState(0);
  const [helpersNeeded, setHelpersNeeded] = useState(0);
  const [internalNotes, setInternalNotes] = useState('');
  const [isOpenForClaims, setIsOpenForClaims] = useState(false);
  const [crewPayMin, setCrewPayMin] = useState(0);
  const [crewPayMax, setCrewPayMax] = useState(0);
  const [selectedCrewForAssignment, setSelectedCrewForAssignment] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'driver' | 'helper'>('helper');
  const [updating, setUpdating] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string>('');

  useEffect(() => {
    loadJobs();
    loadCrewMembers();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      setScheduledDate(selectedJob.scheduled_date || '');
      setScheduledTime(selectedJob.scheduled_time || '');
      setArrivalStart(selectedJob.arrival_window_start || '');
      setArrivalEnd(selectedJob.arrival_window_end || '');
      setDriversNeeded(selectedJob.staffing_needs?.drivers || 0);
      setHelpersNeeded(selectedJob.staffing_needs?.helpers || 0);
      setInternalNotes(selectedJob.internal_notes || '');
      setIsOpenForClaims(selectedJob.is_open_for_claims || false);
      setCrewPayMin(selectedJob.crew_pay_min || 0);
      setCrewPayMax(selectedJob.crew_pay_max || 0);
      setMarketplaceError('');
    }
  }, [selectedJob]);

  const loadJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const jobsWithDetails: JobWithDetails[] = [];

      for (const job of jobsData || []) {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', job.quote_id)
          .maybeSingle();

        const { data: request } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', job.service_request_id)
          .maybeSingle();

        if (quote) {
          jobsWithDetails.push({
            ...job,
            quote,
            service_request: request || {
              id: job.service_request_id,
              customer_id: job.customer_id,
              service_type: job.service_type || 'moving',
              location_address: 'See quote details',
              contact_name: job.customer_name,
              preferred_date: null,
              contact_phone: job.customer_phone,
              description: null,
              photos_urls: [],
              status: 'accepted',
              created_at: job.created_at,
              updated_at: job.updated_at,
            },
          });
        }
      }

      setJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'crew');

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (error) {
      console.error('Error loading crew members:', error);
    }
  };

  const handleOpenForClaimsChange = (checked: boolean) => {
    if (checked) {
      if (!scheduledDate) {
        setMarketplaceError('A scheduled date is required to post to marketplace');
        return;
      }
      if (driversNeeded + helpersNeeded === 0) {
        setMarketplaceError('At least one driver or helper position is required');
        return;
      }
    }
    setMarketplaceError('');
    setIsOpenForClaims(checked);
  };

  const calculateStaffingStatus = (job: JobWithDetails) => {
    const needs = job.staffing_needs || { drivers: 0, helpers: 0 };
    const assignments = job.crew_assignments || [];

    const assignedDrivers = assignments.filter(a => a.role === 'driver').length;
    const assignedHelpers = assignments.filter(a => a.role === 'helper').length;

    if (assignedDrivers >= needs.drivers && assignedHelpers >= needs.helpers && (needs.drivers > 0 || needs.helpers > 0)) {
      return 'fully_staffed';
    } else if (assignedDrivers > 0 || assignedHelpers > 0) {
      return 'partially_staffed';
    }
    return 'unstaffed';
  };

  const handleUpdateScheduling = async () => {
    if (!selectedJob) return;

    if (isOpenForClaims) {
      if (!scheduledDate) {
        setMarketplaceError('A scheduled date is required to post to marketplace');
        return;
      }
      if (driversNeeded + helpersNeeded === 0) {
        setMarketplaceError('At least one driver or helper position is required');
        return;
      }
    }

    setUpdating(true);
    setMarketplaceError('');

    try {
      const newStaffingStatus = calculateStaffingStatus({
        ...selectedJob,
        staffing_needs: { drivers: driversNeeded, helpers: helpersNeeded },
      });

      const wasOpenForClaims = selectedJob.is_open_for_claims;
      const marketplacePostedAt = isOpenForClaims && !wasOpenForClaims
        ? new Date().toISOString()
        : !isOpenForClaims
          ? null
          : selectedJob.marketplace_posted_at;

      const { error } = await supabase
        .from('jobs')
        .update({
          scheduled_date: scheduledDate || null,
          scheduled_time: scheduledTime || null,
          arrival_window_start: arrivalStart || null,
          arrival_window_end: arrivalEnd || null,
          staffing_needs: { drivers: driversNeeded, helpers: helpersNeeded },
          internal_notes: internalNotes || null,
          is_open_for_claims: isOpenForClaims,
          crew_pay_min: crewPayMin || null,
          crew_pay_max: crewPayMax || null,
          marketplace_posted_at: marketplacePostedAt,
          staffing_status: newStaffingStatus,
        })
        .eq('id', selectedJob.id);

      if (error) throw error;

      await loadJobs();
      const updatedJob = jobs.find(j => j.id === selectedJob.id);
      if (updatedJob) {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', selectedJob.id)
          .single();

        if (data) {
          setSelectedJob({
            ...updatedJob,
            ...data,
          });
        }
      }
    } catch (error) {
      console.error('Error updating scheduling:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignCrew = async () => {
    if (!selectedJob || !selectedCrewForAssignment) return;
    setUpdating(true);

    try {
      const currentAssignments = selectedJob.crew_assignments || [];

      const alreadyAssigned = currentAssignments.some(
        a => a.user_id === selectedCrewForAssignment
      );

      if (alreadyAssigned) {
        alert('This crew member is already assigned to this job');
        setUpdating(false);
        return;
      }

      const newAssignment: CrewAssignment = {
        user_id: selectedCrewForAssignment,
        role: selectedRole,
        claimed_at: new Date().toISOString(),
        assigned_by: user?.id || null,
      };

      const updatedAssignments = [...currentAssignments, newAssignment];
      const updatedCrewIds = [...new Set([
        ...(selectedJob.assigned_crew_ids || []),
        selectedCrewForAssignment,
      ])];

      const newStaffingStatus = calculateStaffingStatus({
        ...selectedJob,
        crew_assignments: updatedAssignments,
      });

      const { error } = await supabase
        .from('jobs')
        .update({
          crew_assignments: updatedAssignments,
          assigned_crew_ids: updatedCrewIds,
          staffing_status: newStaffingStatus,
        })
        .eq('id', selectedJob.id);

      if (error) throw error;

      setSelectedCrewForAssignment('');
      await loadJobs();

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', selectedJob.id)
        .single();

      if (data) {
        const updatedJob = jobs.find(j => j.id === selectedJob.id);
        if (updatedJob) {
          setSelectedJob({
            ...updatedJob,
            ...data,
          });
        }
      }
    } catch (error) {
      console.error('Error assigning crew:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFinalizeJob = async () => {
    if (!selectedJob) return;

    if (!scheduledDate) {
      alert('Please set a scheduled date before finalizing');
      return;
    }

    if (driversNeeded + helpersNeeded === 0) {
      alert('Please set staffing needs (at least one driver or helper) before finalizing');
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'scheduled',
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          arrival_window_start: arrivalStart || null,
          arrival_window_end: arrivalEnd || null,
          staffing_needs: { drivers: driversNeeded, helpers: helpersNeeded },
          internal_notes: internalNotes || null,
          staffing_status: 'unstaffed',
        })
        .eq('id', selectedJob.id);

      if (error) throw error;

      await loadJobs();
      setSelectedJob(null);
    } catch (error) {
      console.error('Error finalizing job:', error);
      alert('Failed to finalize job. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveCrewAssignment = async (userId: string) => {
    if (!selectedJob) return;
    setUpdating(true);

    try {
      const updatedAssignments = (selectedJob.crew_assignments || []).filter(
        a => a.user_id !== userId
      );

      const otherUserIds = updatedAssignments.map(a => a.user_id);
      const updatedCrewIds = [...new Set(otherUserIds)];

      const newStaffingStatus = calculateStaffingStatus({
        ...selectedJob,
        crew_assignments: updatedAssignments,
      });

      const { error } = await supabase
        .from('jobs')
        .update({
          crew_assignments: updatedAssignments,
          assigned_crew_ids: updatedCrewIds,
          staffing_status: newStaffingStatus,
        })
        .eq('id', selectedJob.id);

      if (error) throw error;

      await loadJobs();

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', selectedJob.id)
        .single();

      if (data) {
        const updatedJob = jobs.find(j => j.id === selectedJob.id);
        if (updatedJob) {
          setSelectedJob({
            ...updatedJob,
            ...data,
          });
        }
      }
    } catch (error) {
      console.error('Error removing crew assignment:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'moving': return 'Moving';
      case 'junk_removal': return 'Junk Removal';
      case 'demolition': return 'Light Demo';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled_draft: 'bg-purple-100 text-purple-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled_draft': return 'Draft';
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStaffingStatusBadge = (status: string) => {
    const styles = {
      unstaffed: 'bg-red-100 text-red-700',
      partially_staffed: 'bg-yellow-100 text-yellow-700',
      fully_staffed: 'bg-green-100 text-green-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getStaffingStatusLabel = (status: string) => {
    switch (status) {
      case 'unstaffed': return 'Unstaffed';
      case 'partially_staffed': return 'Partially Staffed';
      case 'fully_staffed': return 'Fully Staffed';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCrewName = (userId: string) => {
    const crew = crewMembers.find(c => c.id === userId);
    return crew?.full_name || 'Unknown';
  };

  if (selectedJob) {
    const currentAssignments = selectedJob.crew_assignments || [];
    const assignedDrivers = currentAssignments.filter(a => a.role === 'driver');
    const assignedHelpers = currentAssignments.filter(a => a.role === 'helper');

    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="jobs"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Jobs', onClick: () => setSelectedJob(null) },
          { label: getServiceLabel(selectedJob.service_request.service_type) }
        ]}
      >
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Scheduling
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Job Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Scheduled Time
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Arrival Start
                    </label>
                    <Input
                      type="time"
                      value={arrivalStart}
                      onChange={(e) => setArrivalStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Arrival End
                    </label>
                    <Input
                      type="time"
                      value={arrivalEnd}
                      onChange={(e) => setArrivalEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Staffing Needs <span className="text-red-500">*</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Drivers
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={driversNeeded}
                        onChange={(e) => setDriversNeeded(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Helpers
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={helpersNeeded}
                        onChange={(e) => setHelpersNeeded(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Internal Notes
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                    placeholder="Internal notes for admin reference..."
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Crew Pay (Estimated)</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Internal estimate shown to crew. Adjust if the job sits unclaimed.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Min ($)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={crewPayMin}
                        onChange={(e) => setCrewPayMin(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max ($)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={crewPayMax}
                        onChange={(e) => setCrewPayMax(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {selectedJob.status !== 'scheduled_draft' && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="openForClaims"
                        checked={isOpenForClaims}
                        onChange={(e) => handleOpenForClaimsChange(e.target.checked)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="openForClaims" className="text-sm font-medium text-gray-700">
                        Open for crew to claim positions
                      </label>
                    </div>
                    {marketplaceError && (
                      <p className="text-xs text-red-600 mt-2">{marketplaceError}</p>
                    )}
                  </div>
                )}

                {selectedJob.status === 'scheduled_draft' ? (
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      onClick={handleUpdateScheduling}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleFinalizeJob}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'Finalizing...' : 'Finalize Job'}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Finalize to make job available for scheduling and crew assignment
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleUpdateScheduling}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? 'Saving...' : 'Save Scheduling'}
                  </Button>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Crew Assignments
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Drivers ({assignedDrivers.length}/{driversNeeded})
                    </span>
                    {assignedDrivers.length >= driversNeeded && driversNeeded > 0 && (
                      <span className="text-xs text-green-600 font-medium">Filled</span>
                    )}
                  </div>
                  {assignedDrivers.length > 0 ? (
                    <div className="space-y-2">
                      {assignedDrivers.map((assignment) => (
                        <div
                          key={assignment.user_id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-900">
                            {getCrewName(assignment.user_id)}
                          </span>
                          <button
                            onClick={() => handleRemoveCrewAssignment(assignment.user_id)}
                            disabled={updating}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No drivers assigned</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Helpers ({assignedHelpers.length}/{helpersNeeded})
                    </span>
                    {assignedHelpers.length >= helpersNeeded && helpersNeeded > 0 && (
                      <span className="text-xs text-green-600 font-medium">Filled</span>
                    )}
                  </div>
                  {assignedHelpers.length > 0 ? (
                    <div className="space-y-2">
                      {assignedHelpers.map((assignment) => (
                        <div
                          key={assignment.user_id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-900">
                            {getCrewName(assignment.user_id)}
                          </span>
                          <button
                            onClick={() => handleRemoveCrewAssignment(assignment.user_id)}
                            disabled={updating}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No helpers assigned</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Assign Crew Member</h4>
                <div className="space-y-3">
                  <select
                    value={selectedCrewForAssignment}
                    onChange={(e) => setSelectedCrewForAssignment(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    <option value="">Select crew member...</option>
                    {crewMembers.map((crew) => (
                      <option key={crew.id} value={crew.id}>
                        {crew.full_name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRole('driver')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedRole === 'driver'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Driver
                    </button>
                    <button
                      onClick={() => setSelectedRole('helper')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedRole === 'helper'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Helper
                    </button>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={handleAssignCrew}
                    disabled={!selectedCrewForAssignment || updating}
                    className="w-full"
                  >
                    Assign to Job
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Job Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Customer</p>
                <p className="font-medium text-gray-900">
                  {selectedJob.customer_name || selectedJob.service_request?.contact_name || 'N/A'}
                </p>
                {(selectedJob.customer_email || selectedJob.customer_phone) && (
                  <div className="text-xs text-gray-600 mt-1">
                    {selectedJob.customer_email && <div>{selectedJob.customer_email}</div>}
                    {selectedJob.customer_phone && <div>{selectedJob.customer_phone}</div>}
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-500 mb-1">Service Type</p>
                <p className="font-medium text-gray-900">
                  {getServiceLabel(selectedJob.service_type || selectedJob.service_request?.service_type || 'N/A')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Location</p>
                <p className="font-medium text-gray-900">
                  {selectedJob.service_request?.location_address || 'See quote details'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Quote Amount</p>
                <p className="font-medium text-gray-900">
                  ${Number(selectedJob.quote.total_amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Job Status</p>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedJob.status)}`}>
                  {getStatusLabel(selectedJob.status)}
                </span>
              </div>
              {selectedJob.source_quote_id && (
                <div>
                  <p className="text-gray-500 mb-1">Source</p>
                  <p className="font-medium text-gray-900">Quote Acceptance</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="jobs"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'Jobs' }
      ] : undefined}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Manage Jobs</h2>
            <p className="text-gray-600">Schedule jobs and assign crew members</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterView('drafts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterView === 'drafts'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Drafts ({jobs.filter(j => j.status === 'scheduled_draft').length})
          </button>
          <button
            onClick={() => setFilterView('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterView === 'active'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Scheduled/Active ({jobs.filter(j => j.status !== 'scheduled_draft').length})
          </button>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading jobs...</p>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No jobs yet</p>
          </Card>
        ) : (() => {
          const filteredJobs = jobs.filter(job =>
            filterView === 'drafts'
              ? job.status === 'scheduled_draft'
              : job.status !== 'scheduled_draft'
          );

          if (filteredJobs.length === 0) {
            return (
              <Card className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filterView === 'drafts' ? 'No draft jobs' : 'No scheduled/active jobs'}
                </p>
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => {
              const needs = job.staffing_needs || { drivers: 0, helpers: 0 };
              const assignments = job.crew_assignments || [];
              const assignedDrivers = assignments.filter(a => a.role === 'driver').length;
              const assignedHelpers = assignments.filter(a => a.role === 'helper').length;

              return (
                <Card
                  key={job.id}
                  className="p-6 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                          {getServiceLabel(job.service_type || job.service_request?.service_type || 'N/A')}
                        </span>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        {job.status !== 'scheduled_draft' && (
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStaffingStatusBadge(job.staffing_status)}`}>
                            {getStaffingStatusLabel(job.staffing_status)}
                          </span>
                        )}
                        {job.is_open_for_claims && (
                          <span className="px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700 rounded-full">
                            Open for Claims
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {job.customer_name || job.service_request?.contact_name || 'Customer'}
                      </div>
                      <div className="flex items-start gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="font-medium">{job.service_request?.location_address || 'See details'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">
                        ${Number(job.quote.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    {job.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(job.scheduled_date)}</span>
                      </div>
                    )}
                    {job.arrival_window_start && job.arrival_window_end && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(job.arrival_window_start)} - {formatTime(job.arrival_window_end)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        D: {assignedDrivers}/{needs.drivers} | H: {assignedHelpers}/{needs.helpers}
                      </span>
                    </div>
                  </div>
                </Card>
              );
              })}
            </div>
          );
        })()}
      </div>
    </PortalLayout>
  );
}
