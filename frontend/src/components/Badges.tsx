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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-brand-red text-brand-white border border-brand-red">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>New Alert</span>
        </span>
      );
    case 'in_review':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-brand-card text-brand-yellow border border-brand-yellow">
          <Eye className="w-3.5 h-3.5" />
          <span>In Review</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-brand-white text-brand-black border border-brand-white">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-black" />
          <span>Confirmed</span>
        </span>
      );
    case 'false_alarm':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-brand-card text-brand-textMuted border border-brand-border">
          <XCircle className="w-3.5 h-3.5" />
          <span>False Alarm</span>
        </span>
      );
    case 'escalated':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-brand-black text-brand-red border border-brand-red">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Escalated</span>
        </span>
      );
    case 'closed':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-brand-card text-brand-textMuted border border-brand-border">
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-brand-red text-brand-white">
          <Sword className="w-3.5 h-3.5 text-brand-yellow" />
          <span>Weapon Detected</span>
        </span>
      );
    case 'fight':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-brand-black text-brand-red border border-brand-red">
          <Flame className="w-3.5 h-3.5 text-brand-red" />
          <span>Physical Fight</span>
        </span>
      );
    case 'unattended_object':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-brand-card text-brand-yellow border border-brand-yellow">
          <Briefcase className="w-3.5 h-3.5 text-brand-yellow" />
          <span>Unattended Object</span>
        </span>
      );
    case 'overcrowding':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-brand-card text-brand-white border border-brand-borderLight">
          <Users className="w-3.5 h-3.5 text-brand-yellow" />
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
