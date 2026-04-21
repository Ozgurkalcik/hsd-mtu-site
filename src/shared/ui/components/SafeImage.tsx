'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

export default function SafeImage({ src, alt, unoptimized, ...props }: ImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={hasError ? true : unoptimized}
      onError={() => {
        if (!hasError) {
          console.warn(`Next.js image optimization failed for ${src}, falling back to unoptimized raw URL.`);
          setHasError(true);
        }
      }}
      {...props}
    />
  );
}
