import { MobileNavigationHeader } from '@/components/application/app-navigation/base-components/mobile-header';
import { NavItemBase } from '@/components/application/app-navigation/base-components/nav-item';
import { ShindrajLogo } from '@/components/foundations/logo/shindraj-logo';

const SIDEBAR_WIDTH = 272;

// App frame shared by billing, customer lookup, shop admin and owner admin:
// Untitled UI's sectioned sidebar on desktop, its slide-out menu on phones.
// `sections` is [{ label, items: [{ label, icon, href?, onClick?, current?, badge? }] }].
export default function AppShell({ sections = [], subtitle, footer, children }) {
  const sidebar = (
    <aside
      style={{ '--width': `${SIDEBAR_WIDTH}px` }}
      className="flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary pt-5 shadow-xs ring-secondary ring-inset lg:w-(--width) lg:rounded-xl lg:ring-1"
    >
      <div className="flex flex-col gap-1 px-4 lg:px-5">
        <ShindrajLogo />
        {subtitle && <p className="pl-[42px] text-sm text-tertiary">{subtitle}</p>}
      </div>

      <ul className="mt-6">
        {sections.map((group) => (
          <li key={group.label}>
            <div className="px-5 pb-1">
              <p className="text-xs font-semibold text-quaternary">{group.label}</p>
            </div>
            <ul className="px-4 pb-5">
              {group.items.map((item) => (
                <li key={item.label} className="py-0.5">
                  <NavItemBase
                    type="link"
                    icon={item.icon}
                    // Section switchers have no page of their own; '#' still makes
                    // them a focusable link for keyboard users.
                    href={item.href ?? (item.onClick ? '#' : undefined)}
                    badge={item.badge}
                    current={item.current}
                    onClick={
                      item.onClick
                        ? (e) => {
                            e.preventDefault();
                            item.onClick();
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </NavItemBase>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {footer && <div className="mt-auto flex flex-col gap-3 border-t border-secondary px-4 py-4">{footer}</div>}
    </aside>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
      <MobileNavigationHeader>{sidebar}</MobileNavigationHeader>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:py-1 lg:pl-1">{sidebar}</div>
      <div style={{ paddingLeft: SIDEBAR_WIDTH + 4 }} className="invisible hidden lg:block" />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
