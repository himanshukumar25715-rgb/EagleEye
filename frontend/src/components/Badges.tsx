import React from 'react';
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  Archive,
  Sword,
  Flame,
  Briefcase,
  Users
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status.toLowerCase()) {
    case 'new':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-brand-red text-white border border-brand-red">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>New Alert</span>
        </span>
      );
    case 'in_review':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Eye className="w-3.5 h-3.5 text-amber-700" />
          <span>In Review</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 text-white border border-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          <span>Confirmed</span>
        </span>
      );
    case 'false_alarm':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-neutral-100 text-brand-textMuted border border-brand-border">
          <XCircle className="w-3.5 h-3.5" />
          <span>False Alarm</span>
        </span>
      );
    case 'escalated':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-brand-red border border-brand-red">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Escalated</span>
        </span>
      );
    case 'closed':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-neutral-100 text-brand-textMuted border border-brand-border">
          <Archive className="w-3.5 h-3.5" />
          <span>Closed</span>
        </span>
      );
  }
};

interface TypeBadgeProps {
  type: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  switch (type.toLowerCase()) {
    case 'weapon':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-brand-red text-white shadow-sm">
          <Sword className="w-3.5 h-3.5 text-white" />
          <span>Weapon Detected</span>
        </span>
      );
    case 'fight':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-brand-red border border-brand-red">
          <Flame className="w-3.5 h-3.5 text-brand-red" />
          <span>Physical Fight</span>
        </span>
      );
    case 'unattended_object':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Briefcase className="w-3.5 h-3.5 text-amber-700" />
          <span>Unattended Object</span>
        </span>
      );
    case 'overcrowding':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <Users className="w-3.5 h-3.5 text-blue-700" />
          <span>Overcrowding Alert</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-brand-card text-brand-yellow border border-brand-border">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{type}</span>
        </span>
      );
  }
};
