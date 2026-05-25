import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Card = ({ children, className, ...props }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className }) => (
  <div className={cn("px-6 py-4 border-b border-slate-700/50 font-bold text-lg", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);
