// Untitled UI page header: title, one supporting line, actions on the right.
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="flex flex-col gap-5 px-4 pt-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
          {description && <p className="text-md text-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
