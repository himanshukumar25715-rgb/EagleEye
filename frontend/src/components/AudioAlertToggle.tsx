import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import { audioAlert } from '../utils/audioAlert';

export const AudioAlertToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(audioAlert.isEnabled());

  useEffect(() => {
    return audioAlert.subscribe((val) => setEnabled(val));
  }, []);

  const handleToggle = () => {
    audioAlert.toggle();
  };

  return (
    <button
      onClick={handleToggle}
      title={enabled ? 'Audio Alarm Active (Click to Mute)' : 'Audio Alarm Muted (Click to Unmute)'}
      className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-mono font-bold transition-all border ${
        enabled
          ? 'bg-brand-black text-brand-yellow border-brand-yellow hover:bg-brand-yellow hover:text-brand-black shadow-sm'
          : 'bg-brand-card text-brand-textMuted border-brand-border hover:border-brand-red hover:text-brand-red'
      }`}
    >
      {enabled ? (
        <>
          <Volume2 className="w-3.5 h-3.5 text-brand-yellow animate-pulse" />
          <span className="tracking-wider">ALARM SOUND: ON</span>
        </>
      ) : (
        <>
          <VolumeX className="w-3.5 h-3.5 text-brand-textMuted" />
          <span className="tracking-wider">ALARM SOUND: MUTED</span>
        </>
      )}
    </button>
  );
};
