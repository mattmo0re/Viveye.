import { PropsWithChildren, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export const SectionCard = ({
  title,
  description,
  icon,
  className,
  actions,
  children,
}: PropsWithChildren<SectionCardProps>) => (
  <motion.section
    className={cn(
      'relative overflow-hidden rounded-3xl border border-white/10 bg-white/4 p-6 shadow-[0_0_45px_rgba(36,38,45,0.35)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/6',
      className,
    )}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 text-slate-200">
          {icon && <span className="text-slate-200/80">{icon}</span>}
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        {description && <p className="mt-2 text-sm text-slate-300/80">{description}</p>}
      </div>
      {actions}
    </div>
    <div className="space-y-6 text-slate-100">{children}</div>
    <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/5" />
    <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
  </motion.section>
);
