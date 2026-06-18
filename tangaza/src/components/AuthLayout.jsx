import billboardHero from '../assets/billboard-hero.jpg';

/**
 * Full-bleed billboard backdrop for the auth screens. The `image` prop points at
 * a file in /public (drop-in replaceable); if it's missing the browser falls
 * through to the bundled hero photo, so the background is never blank. A forest
 * overlay keeps the centred card readable.
 */
export default function AuthLayout({ image, children }) {
  return (
    <div
      className="relative min-h-screen bg-forest bg-cover bg-center"
      style={{ backgroundImage: `url(${image}), url(${billboardHero})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-forest/90 via-forest/45 to-forest-deep/85" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-28">
        <div className="w-full max-w-md rounded-3xl bg-cream p-8 shadow-2xl ring-1 ring-black/5">
          {children}
        </div>
      </div>
    </div>
  );
}
