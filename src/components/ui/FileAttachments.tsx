import { useState, useEffect } from 'react';
import { Paperclip, Upload, Download, Eye, Trash2, FileText, Image as ImageIcon, File, X } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Attachment {
  id: string;
  uploaded_by: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  description: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface FileAttachmentsProps {
  entityType: string;
  entityId: string;
  allowUpload?: boolean;
  title?: string;
}

export function FileAttachments({ entityType, entityId, allowUpload = true, title = 'Attachments' }: FileAttachmentsProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          profiles:uploaded_by (
            full_name
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        const { error } = await supabase
          .from('attachments')
          .insert({
            uploaded_by: user.id,
            entity_type: entityType,
            entity_id: entityId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: fileData,
            description: ''
          });

        if (error) throw error;
      }

      await loadAttachments();
      setShowUpload(false);
      e.target.value = '';
    } catch (err: any) {
      console.error('Error uploading file:', err);
      showToast('error', 'Failed to upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (attachmentId: string) => {
    setConfirmDeleteId(attachmentId);
  };

  const confirmDelete = async (attachmentId: string) => {
    setConfirmDeleteId(null);
    try {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      await loadAttachments();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      showToast('error', 'Failed to delete attachment: ' + err.message);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.storage_path;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (attachment: Attachment) => {
    window.open(attachment.storage_path, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <Paperclip className="w-5 h-5" />
          <span className="font-medium">Loading attachments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {toast && (
        <div className={`flex items-center gap-3 p-3 mx-4 mt-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-sm font-semibold text-gray-900 mb-2">Delete Attachment?</p>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => confirmDelete(confirmDeleteId)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {title} ({attachments.length})
          </h3>
        </div>
        {allowUpload && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        )}
      </div>

      {showUpload && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <label className="block">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {uploading && (
              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
            )}
          </label>
        </div>
      )}

      <div className="p-4">
        {attachments.length === 0 ? (
          <div className="text-center py-8">
            <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No attachments yet</p>
            {allowUpload && (
              <p className="text-sm text-gray-400 mt-1">
                Click "Upload Files" to add documents or images
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(attachment.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>
                        {attachment.profiles?.full_name || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => handleView(attachment)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {(attachment.uploaded_by === user?.id || allowUpload) && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
