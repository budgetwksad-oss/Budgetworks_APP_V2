import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileText, Plus, X, CreditCard as Edit, Trash2, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  service_type: string;
  line_items: LineItem[];
  tax_rate: number;
  notes: string;
  is_active: boolean;
  created_at: string;
}

interface QuoteTemplatesProps {
  onBack: () => void;
}

export function QuoteTemplates({ onBack }: QuoteTemplatesProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_type: 'moving',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }] as LineItem[],
    tax_rate: 0,
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: QuoteTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      service_type: template.service_type,
      line_items: template.line_items,
      tax_rate: template.tax_rate,
      notes: template.notes,
      is_active: template.is_active
    });
    setShowForm(true);
  };

  const handleDuplicate = (template: QuoteTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      service_type: template.service_type,
      line_items: template.line_items,
      tax_rate: template.tax_rate,
      notes: template.notes,
      is_active: true
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      const { error } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadTemplates();
      showToast('success', 'Template deleted successfully');
    } catch (err: any) {
      console.error('Error deleting template:', err);
      showToast('error', 'Failed to delete template: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.line_items.length === 0) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      const templateData = {
        ...formData,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('quote_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('success', 'Template updated successfully');
      } else {
        const { error } = await supabase
          .from('quote_templates')
          .insert([templateData]);

        if (error) throw error;
        showToast('success', 'Template created successfully');
      }

      await loadTemplates();
      handleCancel();
    } catch (err: any) {
      console.error('Error saving template:', err);
      showToast('error', 'Failed to save template: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      service_type: 'moving',
      line_items: [{ description: '', quantity: 1, unit_price: 0 }],
      tax_rate: 0,
      notes: '',
      is_active: true
    });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index)
    });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...formData.line_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, line_items: updatedItems });
  };

  const getServiceLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const calculateTotal = (items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (showForm) {
    const { subtotal, tax, total } = calculateTotal(formData.line_items, formData.tax_rate);

    return (
      <PortalLayout
        portalName="Admin Portal"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Quote Templates', onClick: handleCancel },
          { label: editingTemplate ? 'Edit Template' : 'New Template' }
        ]}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {toast && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <span className="text-sm font-medium">{toast.message}</span>
              <button type="button" onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <CheckCircle className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard 2-Bedroom Move"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="moving">Moving</option>
                  <option value="junk_removal">Junk Removal</option>
                  <option value="demolition">Demolition</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description of this template"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Line Items</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="w-32 text-right pt-2">
                    <span className="font-semibold text-gray-900">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    disabled={formData.line_items.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span>Tax Rate (%):</span>
                <Input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax:</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Additional Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Default notes to include in quotes using this template"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Template is active and available for use
                </label>
              </div>
            </div>
          </Card>
        </form>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Quote Templates' }
      ]}
    >
      <div className="space-y-6">
        {toast && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <span className="text-sm font-medium">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}

        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
              <p className="text-sm font-semibold text-gray-900 mb-2">Delete Template?</p>
              <p className="text-sm text-gray-500 mb-4">This action cannot be undone. The template will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => confirmDelete(confirmDeleteId)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Quote Templates
            </h2>
            <p className="text-gray-600 mt-1">Create reusable templates for faster quote generation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No templates yet</p>
            <p className="text-sm text-gray-400 mb-4">Create your first template to speed up quote generation</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const { subtotal, tax, total } = calculateTotal(template.line_items, template.tax_rate);

              return (
                <Card key={template.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{template.name}</h3>
                        {!template.is_active && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full mb-2">
                        {getServiceLabel(template.service_type)}
                      </span>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Line Items:</span>
                      <span className="font-medium">{template.line_items.length}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({template.tax_rate}%):</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-blue-600 pt-2 border-t">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
