import { useState, useRef } from 'react';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface PhotoUploadProps {
  onPhotosChange: (urls: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
}

export function PhotoUpload({ onPhotosChange, existingPhotos = [], maxPhotos = 10 }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError('');

    if (photos.length + files.length > maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);

    try {
      const newPhotoUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const dataUrl = await readFileAsDataURL(file);
        newPhotoUrls.push(dataUrl);
      }

      const updatedPhotos = [...photos, ...newPhotoUrls];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
    } catch (error) {
      console.error('Error uploading photos:', error);
      setUploadError('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Job Photos</h3>
          <span className="text-sm text-gray-500">
            ({photos.length}/{maxPhotos})
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleButtonClick}
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Add Photos'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No photos added yet</p>
          <p className="text-sm text-gray-500">Click "Add Photos" to upload job photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Job photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {photos.length >= maxPhotos && !uploadError && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-700">
            Maximum number of photos reached ({maxPhotos})
          </p>
        </div>
      )}
    </div>
  );
}
