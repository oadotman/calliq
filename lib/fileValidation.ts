/**
 * Client-side File Validation Utilities
 * Provides validation and helper functions for file uploads in the browser
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  duration?: number;
  mimeType?: string;
  warnings?: string[];
  metadata?: {
    estimatedDuration?: number;
    sizeInMB?: number;
  };
}

// Supported audio MIME types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mp4a',
  'audio/mp4a-latm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/vorbis',
  'audio/flac',
  'audio/x-flac',
  'audio/webm',
];

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'flac', 'webm', 'oga'];

// Maximum file size in bytes (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Maximum duration in seconds (4 hours)
const MAX_DURATION = 4 * 60 * 60;

/**
 * Validate audio file on client side
 */
export async function validateAudioFile(file: File): Promise<FileValidationResult> {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    };
  }

  // Validate file size
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
      size: file.size,
    };
  }

  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Validate MIME type - check extension first if no MIME type
  // Some browsers don't provide MIME types for certain files
  // If no MIME type, validate by extension
  if (!file.type || file.type === '') {
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `File type could not be determined. Please ensure the file has a valid extension: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        mimeType: file.type,
      };
    }
    // Extension is valid, continue with validation
  } else if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    // For M4A files, some browsers report unusual MIME types
    if (extension === 'm4a') {
      // Allow M4A files even with unusual MIME types
      console.warn(`M4A file with unusual MIME type: ${file.type}, allowing based on extension`);
    } else {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Supported types: MP3, MP4, M4A, WAV, OGG, FLAC, WebM`,
        mimeType: file.type,
      };
    }
  }

  // Validate file extension
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file extension: .${extension}`,
    };
  }

  // Validate filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Filename too long (max 255 characters)',
    };
  }

  // Try to get duration (optional, non-blocking)
  let duration: number | undefined;
  try {
    duration = await getAudioDuration(file);
    if (duration > MAX_DURATION) {
      return {
        valid: false,
        error: `Audio too long. Maximum duration is ${formatDuration(MAX_DURATION)}`,
        duration,
      };
    }
  } catch (error) {
    // Duration check failed, but we'll allow the upload
    console.warn('Could not determine audio duration:', error);
  }

  return {
    valid: true,
    size: file.size,
    duration,
    mimeType: file.type,
  };
}

/**
 * Get audio file duration in seconds
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        reject(new Error('Could not determine audio duration'));
      } else {
        resolve(audio.duration);
      }
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio file'));
    });

    audio.src = objectUrl;
  });
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Validate multiple files
 */
export async function validateAudioFiles(files: File[]): Promise<FileValidationResult[]> {
  return Promise.all(files.map(file => validateAudioFile(file)));
}

/**
 * Check if a file is a valid audio file based on extension only (quick check)
 */
export function isAudioFile(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS.includes(extension) : false;
}

/**
 * Get supported file types as a string for input accept attribute
 */
export function getAcceptedFileTypes(): string {
  return SUPPORTED_AUDIO_TYPES.join(',');
}

/**
 * Get supported file extensions as a comma-separated string
 */
export function getSupportedExtensions(): string {
  return SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(', ');
}
