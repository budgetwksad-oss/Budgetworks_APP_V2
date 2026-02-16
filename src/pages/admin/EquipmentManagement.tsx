import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Truck,
  Wrench,
  Plus,
  X,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Hammer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Equipment {
  id: string;
  name: string;
  type: string;
  category: string;
  make_model: string;
  year: number | null;
  license_plate: string;
  status: string;
  condition: string;
  notes: string;
  purchase_date: string | null;
  purchase_price: number;
}

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  description: string;
  date: string;
  cost: number;
  performed_by: string;
  next_due_date: string | null;
}

export function EquipmentManagement({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'equipment' | 'maintenance'>('equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'vehicle',
    category: '',
    make_model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: 0,
    status: 'available',
    condition: 'good',
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    equipment_id: '',
    maintenance_type: 'routine',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0,
    performed_by: '',
    next_due_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipmentRes, maintenanceRes] = await Promise.all([
        supabase
          .from('equipment')
          .select('*')
          .order('name'),
        supabase
          .from('equipment_maintenance')
          .select('*')
          .order('date', { ascending: false })
      ]);

      setEquipment(equipmentRes.data || []);
      setMaintenance(maintenanceRes.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      alert('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Please enter equipment name');
      return;
    }

    try {
      const data = {
        ...formData,
        year: formData.year || null,
        purchase_date: formData.purchase_date || null
      };

      if (editingEquipment) {
        const { error } = await supabase
          .from('equipment')
          .update(data)
          .eq('id', editingEquipment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('equipment')
          .insert(data);

        if (error) throw error;
      }

      await loadData();
      setShowModal(false);
      setEditingEquipment(null);
      resetForm();
    } catch (err: any) {
      console.error('Error saving equipment:', err);
      alert('Failed to save equipment: ' + err.message);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!maintenanceForm.equipment_id || !maintenanceForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment_maintenance')
        .insert({
          ...maintenanceForm,
          next_due_date: maintenanceForm.next_due_date || null,
          recorded_by: user?.id
        });

      if (error) throw error;

      await loadData();
      setShowMaintenanceModal(false);
      resetMaintenanceForm();
    } catch (err: any) {
      console.error('Error saving maintenance:', err);
      alert('Failed to save maintenance record: ' + err.message);
    }
  };

  const handleEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setFormData({
      name: item.name,
      type: item.type,
      category: item.category,
      make_model: item.make_model || '',
      year: item.year || new Date().getFullYear(),
      license_plate: item.license_plate || '',
      vin: '',
      serial_number: '',
      purchase_date: item.purchase_date || '',
      purchase_price: item.purchase_price || 0,
      status: item.status,
      condition: item.condition,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      alert('Failed to delete equipment: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'vehicle',
      category: '',
      make_model: '',
      year: new Date().getFullYear(),
      license_plate: '',
      vin: '',
      serial_number: '',
      purchase_date: '',
      purchase_price: 0,
      status: 'available',
      condition: 'good',
      notes: ''
    });
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      equipment_id: '',
      maintenance_type: 'routine',
      description: '',
      date: new Date().toISOString().split('T')[0],
      cost: 0,
      performed_by: '',
      next_due_date: '',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'in_use':
        return 'bg-blue-100 text-blue-700';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700';
      case 'retired':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'vehicle':
        return <Truck className="w-5 h-5" />;
      case 'tool':
        return <Hammer className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
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
        { label: 'Equipment Management' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-8 h-8 text-blue-600" />
              Equipment Management
            </h2>
            <p className="text-gray-600 mt-1">Manage vehicles, tools, and equipment</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'equipment'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Equipment ({equipment.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'maintenance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Maintenance ({maintenance.length})
          </button>
        </div>

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {['available', 'in_use', 'maintenance', 'retired'].map((status) => {
                  const count = equipment.filter(e => e.status === status).length;
                  return (
                    <div key={status} className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setEditingEquipment(null);
                  setShowModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                {equipment.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No equipment</h3>
                    <p className="text-gray-600 mb-4">Add your first piece of equipment</p>
                    <Button
                      variant="primary"
                      onClick={() => {
                        resetForm();
                        setEditingEquipment(null);
                        setShowModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Equipment
                    </Button>
                  </div>
                ) : (
                  equipment.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getEquipmentIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                                {item.status.replace('_', ' ')}
                              </span>
                              <span className={`text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                                {item.condition}
                              </span>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Type:</span>{' '}
                                <span className="capitalize">{item.type}</span>
                              </div>
                              <div>
                                <span className="font-medium">Category:</span>{' '}
                                <span className="capitalize">{item.category}</span>
                              </div>
                              {item.make_model && (
                                <div>
                                  <span className="font-medium">Model:</span> {item.make_model}
                                </div>
                              )}
                              {item.year && (
                                <div>
                                  <span className="font-medium">Year:</span> {item.year}
                                </div>
                              )}
                              {item.license_plate && (
                                <div>
                                  <span className="font-medium">Plate:</span> {item.license_plate}
                                </div>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  resetMaintenanceForm();
                  setShowMaintenanceModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Maintenance
              </Button>
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                {maintenance.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No maintenance records</h3>
                    <p className="text-gray-600 mb-4">Add your first maintenance record</p>
                    <Button
                      variant="primary"
                      onClick={() => {
                        resetMaintenanceForm();
                        setShowMaintenanceModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record Maintenance
                    </Button>
                  </div>
                ) : (
                  maintenance.map((record) => {
                    const equipmentItem = equipment.find(e => e.id === record.equipment_id);
                    return (
                      <div
                        key={record.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {equipmentItem?.name || 'Unknown Equipment'}
                              </h4>
                              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 capitalize">
                                {record.maintenance_type}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">{record.description}</p>
                            <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(record.date).toLocaleDateString()}
                              </div>
                              {record.cost > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  ${record.cost.toFixed(2)}
                                </div>
                              )}
                              {record.performed_by && (
                                <div>Performed by: {record.performed_by}</div>
                              )}
                            </div>
                            {record.next_due_date && (
                              <div className="text-sm text-gray-600 mt-2">
                                Next due: {new Date(record.next_due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEquipment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Equipment Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Type"
                  type="select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="vehicle">Vehicle</option>
                  <option value="tool">Tool</option>
                  <option value="equipment">Equipment</option>
                </Input>

                <Input
                  label="Category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., truck, van, dolly"
                  required
                />
              </div>

              {formData.type === 'vehicle' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Make & Model"
                      type="text"
                      value={formData.make_model}
                      onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
                    />
                    <Input
                      label="Year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    />
                  </div>
                  <Input
                    label="License Plate"
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  />
                </>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Status"
                  type="select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </Input>

                <Input
                  label="Condition"
                  type="select"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  required
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </Input>
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
                  {editingEquipment ? 'Update Equipment' : 'Add Equipment'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEquipment(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Record Maintenance</h3>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="p-6 space-y-4">
              <Input
                label="Equipment"
                type="select"
                value={maintenanceForm.equipment_id}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipment_id: e.target.value })}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </Input>

              <Input
                label="Maintenance Type"
                type="select"
                value={maintenanceForm.maintenance_type}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: e.target.value })}
                required
              >
                <option value="routine">Routine</option>
                <option value="repair">Repair</option>
                <option value="inspection">Inspection</option>
                <option value="other">Other</option>
              </Input>

              <Input
                label="Description"
                type="textarea"
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                rows={3}
                required
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={maintenanceForm.date}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                  required
                />
                <Input
                  label="Cost"
                  type="number"
                  step="0.01"
                  value={maintenanceForm.cost}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) })}
                />
              </div>

              <Input
                label="Performed By"
                type="text"
                value={maintenanceForm.performed_by}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performed_by: e.target.value })}
                placeholder="Vendor or person name"
              />

              <Input
                label="Next Due Date (Optional)"
                type="date"
                value={maintenanceForm.next_due_date}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_date: e.target.value })}
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  Record Maintenance
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowMaintenanceModal(false)}
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
