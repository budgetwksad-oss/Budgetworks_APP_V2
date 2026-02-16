import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Package, Plus, X, Edit2, Trash2, AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  reorder_quantity: number;
  cost_per_unit: number;
  location: string;
  last_restocked: string | null;
}

export function InventoryManagement({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'supplies',
    description: '',
    quantity: 0,
    unit: 'each',
    reorder_level: 10,
    reorder_quantity: 50,
    cost_per_unit: 0,
    location: ''
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error loading inventory:', err);
      alert('Failed to load inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Please enter item name');
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert(formData);

        if (error) throw error;
      }

      await loadInventory();
      setShowModal(false);
      setEditingItem(null);
      resetForm();
    } catch (err: any) {
      console.error('Error saving item:', err);
      alert('Failed to save item: ' + err.message);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit,
      reorder_level: item.reorder_level,
      reorder_quantity: item.reorder_quantity,
      cost_per_unit: item.cost_per_unit,
      location: item.location || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInventory();
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item: ' + err.message);
    }
  };

  const handleRestock = async (item: InventoryItem) => {
    const newQuantity = item.quantity + item.reorder_quantity;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          quantity: newQuantity,
          last_restocked: new Date().toISOString().split('T')[0]
        })
        .eq('id', item.id);

      if (error) throw error;
      await loadInventory();
    } catch (err: any) {
      console.error('Error restocking item:', err);
      alert('Failed to restock item: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'supplies',
      description: '',
      quantity: 0,
      unit: 'each',
      reorder_level: 10,
      reorder_quantity: 50,
      cost_per_unit: 0,
      location: ''
    });
  };

  const lowStockItems = items.filter(item => item.quantity <= item.reorder_level);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);

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
        { label: 'Inventory Management' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" />
              Inventory Management
            </h2>
            <p className="text-gray-600 mt-1">Track supplies, materials, and consumables</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setEditingItem(null);
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              </div>
              <Package className="w-12 h-12 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-12 h-12 text-green-600" />
            </div>
          </Card>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-900 font-medium">Low Stock Alert</p>
                <p className="text-sm text-orange-700 mt-1">
                  {lowStockItems.length} item(s) need restocking
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No inventory items</h3>
                <p className="text-gray-600 mb-4">Add your first inventory item</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    resetForm();
                    setEditingItem(null);
                    setShowModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const isLowStock = item.quantity <= item.reorder_level;
                return (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${
                      isLowStock ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 capitalize">
                            {item.category.replace('_', ' ')}
                          </span>
                          {isLowStock && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}
                        <div className="grid md:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Quantity:</span>{' '}
                            <span className={isLowStock ? 'text-orange-600 font-bold' : ''}>
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Reorder at:</span> {item.reorder_level} {item.unit}
                          </div>
                          {item.location && (
                            <div>
                              <span className="font-medium">Location:</span> {item.location}
                            </div>
                          )}
                          {item.cost_per_unit > 0 && (
                            <div>
                              <span className="font-medium">Value:</span> ${(item.quantity * item.cost_per_unit).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {isLowStock && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRestock(item)}
                          >
                            Restock (+{item.reorder_quantity})
                          </Button>
                        )}
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
                );
              })
            )}
          </div>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Item Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Category"
                type="select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="supplies">Supplies</option>
                <option value="materials">Materials</option>
                <option value="safety_equipment">Safety Equipment</option>
                <option value="cleaning">Cleaning</option>
                <option value="packing">Packing</option>
                <option value="other">Other</option>
              </Input>

              <Input
                label="Description"
                type="textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Current Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                />
                <Input
                  label="Unit"
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., box, roll, each"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Reorder Level"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
                  required
                />
                <Input
                  label="Reorder Quantity"
                  type="number"
                  value={formData.reorder_quantity}
                  onChange={(e) => setFormData({ ...formData, reorder_quantity: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Cost per Unit"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) })}
                />
                <Input
                  label="Storage Location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Warehouse A, Shelf 3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
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
