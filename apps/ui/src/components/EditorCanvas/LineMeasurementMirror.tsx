import React from 'react';

export interface LineMeasurementMirrorProps {
  mirrorRef: React.RefObject<HTMLDivElement | null>;
  lines: string[];
}

/**
 * LineMeasurementMirror
 * Off-screen measurement container used by useHeightMap to measure exact wrap heights.
 */
export const LineMeasurementMirror: React.FC<LineMeasurementMirrorProps> = ({
  mirrorRef,
  lines,
}) => {
  return (
    <div
      ref={mirrorRef}
      aria-hidden="true"
      className="absolute opacity-0 pointer-events-none font-editor-mono font-mono text-[15px] leading-6"
      style={{
        visibility: 'hidden',
        position: 'absolute',
        top: -99999,
        left: -99999,
        zIndex: -99,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            minHeight: '24px',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {line === '' ? '\u00A0' : line}
        </div>
      ))}
    </div>
  );
};
