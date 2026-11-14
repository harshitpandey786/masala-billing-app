import { cx } from '@/utils/cx';

// Full-bleed backdrop for the app's login screens, built from the shop's own
// product photography (see productImages.js) instead of a flat grey page --
// the one place in the app where a big, rich, on-brand image earns its spot,
// since there is no data to show here. A soft vignette keeps the edges calm
// so the centered card reads clearly against a busy photo.
export default function AuthBackdrop({ className, children }) {
  return (
    <div className={cx('relative flex min-h-dvh flex-col', className)}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/products/5745.jpg')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 20%, rgba(28,25,23,0) 40%, rgba(28,25,23,0.55) 100%)',
        }}
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
