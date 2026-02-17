import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  MessageSquare,
  Plus,
  Star,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Award,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MenuSection } from '../../components/layout/Sidebar';

interface TestimonialSettings {
  id: string;
  is_enabled: boolean;
  rating_value: number | null;
  review_count: number | null;
  source_label: string;
}

interface Testimonial {
  id: string;
  customer_name: string;
  rating: number;
  content: string;
  service_type: string | null;
  published: boolean;
  featured: boolean;
  created_at: string;
}

interface TestimonialsManagerProps {
  onBack: () => void;
  sidebarSections?: MenuSection[];
}

export function TestimonialsManager({ onBack, sidebarSections }: TestimonialsManagerProps) {
  const [settings, setSettings] = useState<TestimonialSettings | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    rating: 5,
    content: '',
    service_type: 'moving',
    published: true,
    featured: false
  });

  const [settingsForm, setSettingsForm] = useState({
    is_enabled: false,
    rating_value: '',
    review_count: '',
    source_label: 'Google Reviews'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, testimonialsRes] = await Promise.all([
        supabase.from('testimonial_settings').select('*').maybeSingle(),
        supabase.from('testimonials').select('*').order('created_at', { ascending: false })
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsForm({
          is_enabled: settingsRes.data.is_enabled,
          rating_value: settingsRes.data.rating_value?.toString() || '',
          review_count: settingsRes.data.review_count?.toString() || '',
          source_label: settingsRes.data.source_label || 'Google Reviews'
        });
      }

      if (testimonialsRes.data) {
        setTestimonials(testimonialsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const data = {
        is_enabled: settingsForm.is_enabled,
        rating_value: settingsForm.rating_value ? parseFloat(settingsForm.rating_value) : null,
        review_count: settingsForm.review_count ? parseInt(settingsForm.review_count) : null,
        source_label: settingsForm.source_label
      };

      if (settings) {
        const { error } = await supabase
          .from('testimonial_settings')
          .update(data)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('testimonial_settings')
          .insert([data]);

        if (error) throw error;
      }

      await loadData();
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTestimonial = () => {
    setFormData({
      customer_name: '',
      rating: 5,
      content: '',
      service_type: 'moving',
      published: true,
      featured: false
    });
    setEditingTestimonial(null);
    setShowAddModal(true);
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setFormData({
      customer_name: testimonial.customer_name,
      rating: testimonial.rating,
      content: testimonial.content,
      service_type: testimonial.service_type || 'moving',
      published: testimonial.published,
      featured: testimonial.featured
    });
    setEditingTestimonial(testimonial);
    setShowAddModal(true);
  };

  const handleSaveTestimonial = async () => {
    if (!formData.customer_name.trim() || !formData.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingTestimonial) {
        const { error } = await supabase
          .from('testimonials')
          .update({
            customer_name: formData.customer_name,
            rating: formData.rating,
            content: formData.content,
            service_type: formData.service_type,
            published: formData.published,
            featured: formData.featured
          })
          .eq('id', editingTestimonial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('testimonials')
          .insert([{
            customer_name: formData.customer_name,
            rating: formData.rating,
            content: formData.content,
            service_type: formData.service_type,
            published: formData.published,
            featured: formData.featured
          }]);

        if (error) throw error;
      }

      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      alert('Failed to delete testimonial');
    }
  };

  const togglePublished = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ published: !testimonial.published })
        .eq('id', testimonial.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling published:', error);
      alert('Failed to update testimonial');
    }
  };

  const toggleFeatured = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ featured: !testimonial.featured })
        .eq('id', testimonial.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Failed to update testimonial');
    }
  };

  const getServiceLabel = (type: string | null) => {
    switch (type) {
      case 'moving':
        return 'Moving';
      case 'junk_removal':
        return 'Junk Removal';
      case 'demolition':
        return 'Light Demo';
      default:
        return type || 'General';
    }
  };

  if (loading) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="testimonials"
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="testimonials"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Testimonials Manager</h2>
            <p className="text-gray-600">Manage customer testimonials and display settings</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-900">Display Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_enabled"
                checked={settingsForm.is_enabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, is_enabled: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <label htmlFor="is_enabled" className="text-sm font-medium text-gray-900">
                Enable testimonials section on homepage
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Rating Value"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="e.g., 4.9"
                value={settingsForm.rating_value}
                onChange={(e) => setSettingsForm({ ...settingsForm, rating_value: e.target.value })}
              />

              <Input
                label="Review Count"
                type="number"
                min="0"
                placeholder="e.g., 127"
                value={settingsForm.review_count}
                onChange={(e) => setSettingsForm({ ...settingsForm, review_count: e.target.value })}
              />

              <Input
                label="Source Label"
                type="text"
                placeholder="e.g., Google Reviews"
                value={settingsForm.source_label}
                onChange={(e) => setSettingsForm({ ...settingsForm, source_label: e.target.value })}
              />
            </div>

            <Button
              variant="primary"
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-semibold text-gray-900">Testimonials</h3>
            </div>
            <Button
              variant="primary"
              onClick={handleAddTestimonial}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Testimonial
            </Button>
          </div>

          {testimonials.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No testimonials yet</p>
              <Button variant="primary" onClick={handleAddTestimonial}>
                Add Your First Testimonial
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{testimonial.customer_name}</h4>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        {testimonial.service_type && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {getServiceLabel(testimonial.service_type)}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-700 mb-3">{testimonial.content}</p>

                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{new Date(testimonial.created_at).toLocaleDateString()}</span>
                        {testimonial.published && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Eye className="w-4 h-4" />
                            Published
                          </span>
                        )}
                        {!testimonial.published && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <EyeOff className="w-4 h-4" />
                            Draft
                          </span>
                        )}
                        {testimonial.featured && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Award className="w-4 h-4" />
                            Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditTestimonial(testimonial)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={testimonial.published ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => togglePublished(testimonial)}
                      >
                        {testimonial.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant={testimonial.featured ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => toggleFeatured(testimonial)}
                      >
                        <Award className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <Input
                label="Customer Name"
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating })}
                      className={`p-2 rounded ${
                        formData.rating >= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className={`w-8 h-8 ${formData.rating >= rating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="moving">Moving</option>
                  <option value="junk_removal">Junk Removal</option>
                  <option value="demolition">Light Demo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Testimonial Content
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter the customer's testimonial..."
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-900">
                    Published
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="featured" className="text-sm font-medium text-gray-900">
                    Featured
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={handleSaveTestimonial}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Save Testimonial'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PortalLayout>
  );
}
