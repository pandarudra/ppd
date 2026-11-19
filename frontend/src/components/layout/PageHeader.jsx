export default function PageHeader({ title, children, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] md:text-display-lg">{title}</h1>
        {children && <p className="mt-1.5 text-body-md text-body">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
