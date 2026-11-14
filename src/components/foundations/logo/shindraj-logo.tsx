import { cx } from "@/utils/cx"

export const ShindrajLogo = ({ className }: { className?: string }) => (
  <div className={cx("flex items-center gap-2.5", className)}>
    <img src="/logo-mark.png" alt="" className="size-8 shrink-0 object-contain" />
    <span className="text-md font-semibold text-primary">Shindraj Masale</span>
  </div>
)
