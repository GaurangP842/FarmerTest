import React from 'react';

const MessageWaveform = ({
  isActive = false,
  activeColor = '#3b82f6',
  idleColor = '#d1d5db',
  lineCount = 40,
  customHeight = '32px',
  customWidth = '200px',
  progress = 0
}) => {
  // Generate random heights for bars while maintaining a wave-like pattern
  const generateBarHeights = () => {
    const heights = [];
    for (let i = 0; i < lineCount; i++) {
      // Base height between 30% and 100%
      const baseHeight = 30 + Math.random() * 70;

      // Add wave-like modulation
      const wave = Math.sin((i / lineCount) * Math.PI * 2) * 20;
      let height = baseHeight + wave;

      // Ensure height stays within bounds
      height = Math.max(20, Math.min(100, height));
      heights.push(height);
    }
    return heights;
  };

  const barHeights = React.useMemo(() => generateBarHeights(), [lineCount]);

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    height: customHeight,
    width: customWidth
  };

  return (
    <div style={containerStyle}>
      {barHeights.map((height, index) => {
        const linePosition = (index / (lineCount - 1)) * 100;
        const isBeforeProgress = linePosition <= progress;

        return (
          <div
            key={index}
            style={{
              height: `${height}%`,
              width: `${100 / lineCount - 1}%`,
              backgroundColor: isBeforeProgress ? activeColor : idleColor,
              borderRadius: '1px',
              transition: 'all 0.2s',
              animation: isActive
                ? `waveform-bounce 1.2s ease-in-out infinite`
                : 'none',
              animationDelay: `${index * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default MessageWaveform;