import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', className, ...props }) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]",
    neonCyan: "bg-cyan-500 hover:bg-cyan-400 text-slate-900 box-glow-cyan text-glow-cyan",
    neonMagenta: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white box-glow-magenta text-glow-magenta",
    gold: "bg-[#C4A661] hover:bg-[#D4B671] text-[#1A1A1A] box-glow-gold",
    darkGold: "bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#C4A661] border border-[#C4A661]/50 box-glow-dark",
    ghost: "bg-transparent border border-slate-300 text-inherit hover:bg-slate-800",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]"
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};
