/**
 * Custom image loader for CDN integration
 * Optimizes images through CDN with automatic format conversion and resizing
 */

module.exports = function cloudflareLoader({ src, width, quality }) {
  // If CDN URL is not configured, use default
  const cdnUrl = process.env.CDN_URL || '';

  // Handle external URLs
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Cloudflare Image Resizing parameters
  const params = [
    `width=${width}`,
    `quality=${quality || 85}`,
    'format=auto', // Auto-select best format (WebP, AVIF, etc.)
    'fit=scale-down', // Don't upscale images
  ];

  // Return CDN URL with optimization parameters
  if (cdnUrl && cdnUrl.includes('cloudflare')) {
    // Cloudflare Workers format
    return `${cdnUrl}/cdn-cgi/image/${params.join(',')}${src}`;
  }

  // Fallback to regular CDN URL
  return `${cdnUrl}${src}`;
};