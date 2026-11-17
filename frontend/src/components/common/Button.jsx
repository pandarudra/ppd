const VARIANTS = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
  danger: "bg-red-600 hover:bg-red-500 text-white",
};

export default function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
