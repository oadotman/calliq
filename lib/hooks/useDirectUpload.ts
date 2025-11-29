// =====================================================
// DIRECT UPLOAD HOOK
// Handles direct uploads to Supabase Storage
// Zero memory usage on our server - production ready
// =====================================================

import { useState, useCallback } from 'react';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadMetadata {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  salesRep?: string;
  callDate?: string;
  callType?: string;
  participants?: any[];
}

export interface UploadResult {
  success: boolean;
  call?: any;
  error?: string;
}

export function useDirectUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    metadata: UploadMetadata = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Step 1: Get presigned upload URL from our API
      console.log('📋 Requesting presigned upload URL...');

      const urlResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, path, metadata: uploadMetadata } = await urlResponse.json();

      console.log('✅ Presigned URL received');

      // Step 2: Upload directly to Supabase Storage
      console.log('📤 Uploading file to Supabase Storage...');

      const uploadResponse = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percentage,
            };
            setProgress(progressData);

            // Call the progress callback if provided
            if (onProgress) {
              onProgress(progressData);
            }

            console.log(`📊 Upload progress: ${percentage}%`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, { status: xhr.status }));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'false'); // Don't overwrite existing files
        xhr.send(file);
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      console.log('✅ File uploaded to storage');

      // Step 3: Notify our API that upload is complete
      console.log('📝 Creating database record...');

      const completeResponse = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          ...metadata,
        }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const result = await completeResponse.json();

      console.log('✅ Upload completed successfully');

      setUploading(false);
      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      return {
        success: true,
        call: result.call,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      console.error('❌ Upload error:', errorMessage);

      setError(errorMessage);
      setUploading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
}
