import { cx } from '@/utils/cx';

// Full-bleed backdrop for the app's login screens, built from the shop's own
// product photography (see productImages.js) instead of a flat grey page --
// the one place in the app where a big, rich, on-brand image earns its spot,
// since there is no data to show here. Blurred and scaled up slightly (so the
// blur doesn't reveal the image's edges) and dimmed by a vignette, so it
// reads as texture behind the card rather than competing with it.
export default function AuthBackdrop({ className, children }) {
  return (
    <div className={cx('relative flex min-h-dvh flex-col overflow-hidden', className)}>
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
        style={{ backgroundImage: "url('/products/5745.jpg')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 20%, rgba(28,25,23,0.15) 40%, rgba(28,25,23,0.6) 100%)',
        }}
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
