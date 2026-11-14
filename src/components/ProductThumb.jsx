import { Package } from '@untitledui/icons';
import { cx } from '@/utils/cx';
import { productImageFor } from '../productImages.js';

// Real product photos pulled from shindrajmasale.com's own store feed (see
// productImages.js), falling back to a plain package icon tile when a
// product has no match yet. Shared between the counter's product grid and
// the owner's Products & Stock table so both read as a photo-led catalog.
export function ProductThumb({ name, className }) {
  const src = productImageFor(name);
  if (src) {
    return <img src={src} alt="" className={cx('shrink-0 object-cover ring-1 ring-secondary ring-inset', className)} />;
  }
  return (
    <span className={cx('flex shrink-0 items-center justify-center bg-secondary text-fg-quaternary', className)}>
      <Package className="size-5" />
    </span>
  );
}
