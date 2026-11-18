export default function PageHeader({ title, children }) {
  return (
    <div>
      <h1 className="text-[28px] font-medium leading-[1.15] md:text-display-lg">{title}</h1>
      {children && <p className="mt-2 text-body-md text-body">{children}</p>}
    </div>
  );
}
