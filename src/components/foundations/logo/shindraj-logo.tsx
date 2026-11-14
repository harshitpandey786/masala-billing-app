import { cx } from "@/utils/cx"

export const ShindrajLogo = ({ className }: { className?: string }) => (
  <div className={cx("flex items-center gap-3", className)}>
    <img src="/logo-mark.png" alt="" className="size-11 shrink-0 rounded-lg object-contain" />
    <span className="text-xl leading-tight font-bold tracking-tight text-brand-primary">Shindraj Masale</span>
  </div>
)
