import { useState } from 'react';

/**
 * Placeholder imagery for a billboard. Uses a deterministic seeded photo so the
 * same billboard always shows the same picture, and falls back to an on-brand
 * forest/gold panel if the network image fails — so the demo never shows a
 * broken image. Owners will be able to upload real photos later.
 */
export default function BillboardImage({ id, title, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-forest to-forest-soft ${className}`}
      >
        <span className="font-display text-lg tracking-wide text-gold/80">TANGAZAA</span>
      </div>
    );
  }

  return (
    <img
      src={`https://picsum.photos/seed/tangaza-billboard-${id}/800/500`}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
