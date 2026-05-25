import { cn } from '../utils/cn';

export const Input = ({ className, ...props }) => {
  return (
    <input 
      className={cn(
        "w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all",
        className
      )}
      {...props}
    />
  );
};

export const Label = ({ children, className }) => (
  <label className={cn("block text-sm font-medium text-slate-400 mb-2", className)}>
    {children}
  </label>
);
