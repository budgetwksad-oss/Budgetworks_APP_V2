import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ServiceType } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, ArrowRight, Truck, Trash2, Hammer, Upload, X, CheckCircle } from 'lucide-react';

interface RequestQuoteProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestQuote({ onClose, onSuccess }: RequestQuoteProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [serviceType, setServiceType] = useState<ServiceType>('moving');
  const [locationAddress, setLocationAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const serviceTypes = [
    { value: 'moving' as ServiceType, label: 'Moving', icon: Truck, description: 'Residential & commercial moving services' },
    { value: 'junk_removal' as ServiceType, label: 'Junk Removal', icon: Trash2, description: 'Fast junk & waste removal' },
    { value: 'demolition' as ServiceType, label: 'Light Demolition', icon: Hammer, description: 'Small demolition projects' },
  ];

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).slice(0, 5 - photos.length);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('service-photos')
        .upload(fileName, photo);

      if (error) {
        console.error('Error uploading photo:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('service-photos')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const photoUrls = await uploadPhotos();

      const { error: insertError } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user?.id,
          service_type: serviceType,
          location_address: locationAddress,
          contact_phone: contactPhone,
          preferred_date: preferredDate || null,
          description: description || null,
          photos_urls: photoUrls,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setShowConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            We've received your service request. Our team will review it and send you a quote within 24 hours.
          </p>
          <Button variant="primary" className="w-full" onClick={onSuccess}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="text-sm text-gray-600">Step {step} of 4</div>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Service Type</h2>
                  <p className="text-gray-600">Choose the service you need</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {serviceTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setServiceType(type.value)}
                        className={`p-6 rounded-xl border-2 transition-all text-left ${
                          serviceType === type.value
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${
                            serviceType === type.value ? 'bg-orange-600' : 'bg-gray-200'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              serviceType === type.value ? 'text-white' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-lg">{type.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Location & Contact</h2>
                  <p className="text-gray-600">Where do you need the service?</p>
                </div>

                <Input
                  label="Service Address"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="123 Main St, City, Province"
                  required
                />

                <Input
                  label="Contact Phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!locationAddress || !contactPhone}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Details</h2>
                  <p className="text-gray-600">Tell us more about your needs</p>
                </div>

                <Input
                  label="Preferred Date (Optional)"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe what you need help with, approximate size, special requirements, etc."
                    rows={5}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors duration-200"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    onClick={() => setStep(4)}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Photos</h2>
                  <p className="text-gray-600">Add photos to help us understand your needs (optional)</p>
                </div>

                <div className="space-y-4">
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {photos.length < 5 && (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload photos ({photos.length}/5)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 10MB each</p>
                      </div>
                    </label>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
