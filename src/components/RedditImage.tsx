import React, { useState, useEffect } from 'react';

interface RedditImageProps {
  src: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * A component that handles Reddit images with CORS protection and fallbacks.
 * This component attempts to load the image directly, and if that fails due to CORS,
 * it falls back to a provided fallback image or a generated placeholder.
 */
export default function RedditImage({
  src,
  alt = '',
  fallbackSrc,
  className = '',
  width,
  height
}: RedditImageProps) {
  const [error, setError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  
  // Reset error state when the src changes
  useEffect(() => {
    setError(false);
    setFallbackError(false);
  }, [src, fallbackSrc]);
  
  // Validate if the URL is potentially valid
  const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Only filter out Reddit's special values that aren't actually URLs
    // 'nsfw' is a special value in Reddit that means there is a NSFW image but Reddit doesn't provide the thumbnail URL
    if (url === 'self' || url === 'default' || url === 'image') return false;
    
    try {
      // Basic URL validation
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // Check if it's a Reddit image URL
  const isRedditUrl = src && (
    src.includes('redd.it') || 
    src.includes('reddit.com') || 
    src.includes('redditstatic.com')
  );
  
  // Process the image URL to handle Reddit URLs
  const processImageUrl = (url: string) => {
    if (!url || !isValidUrl(url)) return '';
    
    // Use a proxy for Reddit images to avoid CORS issues
    if (isRedditUrl) {
      try {
        // Ensure the URL is properly encoded
        const encodedUrl = encodeURIComponent(url);
        return `https://images.weserv.nl/?url=${encodedUrl}&default=https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(alt || 'default')}&backgroundColor=0f0f0f&radius=12`;
      } catch (e) {
        console.error('Error processing Reddit URL:', e);
        return url; // Fallback to original URL
      }
    }
    
    return url;
  };
  
  // Handle primary image loading errors
  const handleImageError = () => {
    console.log(`Image failed to load: ${src}`);
    setError(true);
  };
  
  // Handle fallback image loading errors
  const handleFallbackError = () => {
    console.log(`Fallback image failed to load: ${fallbackSrc}`);
    setFallbackError(true);
  };
  
  // Generate a placeholder that's guaranteed to work
  const generatePlaceholder = () => {
    const seed = encodeURIComponent(alt || 'default');
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0f0f0f&radius=12`;
  };
  
  // Determine which image source to use
  let imageSrc = '';
  
  if (!error) {
    // Try the primary image first
    imageSrc = isValidUrl(src) ? processImageUrl(src) : '';
  } else if (!fallbackError && fallbackSrc && isValidUrl(fallbackSrc)) {
    // If primary fails, try the fallback
    imageSrc = processImageUrl(fallbackSrc);
  } else {
    // If both fail, use the guaranteed placeholder
    imageSrc = generatePlaceholder();
  }
  
  // If no valid sources, just show the placeholder
  if (!imageSrc) {
    imageSrc = generatePlaceholder();
  }
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={error ? (fallbackSrc ? handleFallbackError : undefined) : handleImageError}
      loading="lazy"
    />
  );
} 