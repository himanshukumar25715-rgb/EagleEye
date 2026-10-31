import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status.toLowerCase()) {
    case 'new':
      return <span className="text-xs font-semibold text-brand-red">New alert</span>;
    case 'in_review':
      return <span className="text-xs font-semibold text-brand-accent">In review</span>;
    case 'confirmed':
      return <span className="text-xs font-semibold text-emerald-700">Confirmed</span>;
    case 'false_alarm':
      return <span className="text-xs font-semibold text-brand-textMuted">False alarm</span>;
    case 'escalated':
      return <span className="text-xs font-semibold text-brand-red">Escalated</span>;
    case 'closed':
    default:
      return <span className="text-xs font-semibold text-brand-textMuted">Closed</span>;
  }
};

interface TypeBadgeProps {
  type: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  switch (type.toLowerCase()) {
    case 'weapon':
      return <span className="text-xs font-semibold text-brand-red">Weapon detected</span>;
    case 'fight':
      return <span className="text-xs font-semibold text-brand-red">Physical fight</span>;
    case 'unattended_object':
      return <span className="text-xs font-semibold text-amber-700">Unattended object</span>;
    case 'overcrowding':
      return <span className="text-xs font-semibold text-brand-accent">Overcrowding alert</span>;
    default:
      return <span className="text-xs font-semibold text-brand-textMuted">{type.replace('_', ' ')}</span>;
  }
};
