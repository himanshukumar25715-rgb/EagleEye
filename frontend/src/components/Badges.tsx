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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>New Alert</span>
        </span>
      );
    case 'in_review':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
          <Eye className="w-3.5 h-3.5" />
          <span>In Review</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed Incident</span>
        </span>
      );
    case 'false_alarm':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-700">
          <XCircle className="w-3.5 h-3.5" />
          <span>False Alarm</span>
        </span>
      );
    case 'escalated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Escalated to Head</span>
        </span>
      );
    case 'closed':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-900 text-stone-400 border border-stone-700">
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700/60">
          <Sword className="w-3.5 h-3.5 text-red-400" />
          <span>Weapon Detected</span>
        </span>
      );
    case 'fight':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/60">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Physical Fight</span>
        </span>
      );
    case 'unattended_object':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/60">
          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
          <span>Unattended Object</span>
        </span>
      );
    case 'overcrowding':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-900/40 text-teal-300 border border-teal-700/60">
          <Users className="w-3.5 h-3.5 text-teal-400" />
          <span>Overcrowding Alert</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-campus-card text-campus-gold border border-campus-border">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{type}</span>
        </span>
      );
  }
};

