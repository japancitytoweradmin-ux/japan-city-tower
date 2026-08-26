import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'navy' | 'gold' | 'emerald' | 'rose' | 'blue' | 'purple' | 'slate';
  badgeText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'navy',
  badgeText,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return {
          cardBg: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/80',
          iconBg: 'bg-amber-500/15 text-amber-700',
          accent: 'text-amber-700',
        };
      case 'emerald':
        return {
          cardBg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/80',
          iconBg: 'bg-emerald-500/15 text-emerald-700',
          accent: 'text-emerald-700',
        };
      case 'rose':
        return {
          cardBg: 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-200/80',
          iconBg: 'bg-rose-500/15 text-rose-700',
          accent: 'text-rose-700',
        };
      case 'blue':
        return {
          cardBg: 'bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border-sky-200/80',
          iconBg: 'bg-sky-500/15 text-sky-700',
          accent: 'text-sky-700',
        };
      case 'purple':
        return {
          cardBg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-200/80',
          iconBg: 'bg-purple-500/15 text-purple-700',
          accent: 'text-purple-700',
        };
      default:
        return {
          cardBg: 'bg-white border-slate-200/90 shadow-sm',
          iconBg: 'bg-slate-900/10 text-slate-800',
          accent: 'text-slate-900',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      id={id}
      onClick={onClick}
      className={`rounded-2xl p-5 border transition-all duration-200 hover:shadow-md ${styles.cardBg} ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-bold tracking-tight ${styles.accent}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {badgeText && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );
};
