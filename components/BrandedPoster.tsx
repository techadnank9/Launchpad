"use client";

type BrandedPosterProps = {
  posterUrl: string;
  companyName?: string;
  logoUrl?: string;
  brandColor?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
};

/** Poster previews — branding is baked into the generated image, not overlaid here. */
export function BrandedPoster({
  posterUrl,
  alt = "Campaign poster",
  className = "",
  imageClassName = "h-full w-full object-cover",
  width = 480,
  height = 480,
}: BrandedPosterProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={alt}
        width={width}
        height={height}
        className={imageClassName}
        loading="lazy"
      />
    </div>
  );
}
