import { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

interface AppShellProps {
  title: string;
  subtitle: string;
}

export const AppShell = ({ title, subtitle, children }: PropsWithChildren<AppShellProps>) => (
  <div className="min-h-screen w-full pb-16">
    <div className="mx-auto max-w-7xl px-6 pt-12">
      <header className="mb-12 flex flex-col gap-4">
        <motion.span
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200/80 shadow-[0_0_35px_rgba(255,255,255,0.12)]"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          VIVEYE // OSINT FUSION
        </motion.span>
        <motion.h1
          className="text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="max-w-3xl text-lg text-slate-300/90 md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
        >
          {subtitle}
        </motion.p>
      </header>
      <motion.main
        className="grid gap-8 lg:grid-cols-[2fr_1fr]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {children}
      </motion.main>
    </div>
  </div>
);
