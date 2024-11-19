import React, { useState, useEffect } from 'react';
import '../styles/AudioWaveform.css';

const AudioWaveform = ({ isActive = false }) => {
    const [heights, setHeights] = useState([
        0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3, 0.8, 0.6, 0.4 // Added more bars
    ]);

    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => {
                setHeights(prevHeights =>
                    prevHeights.map(() => 0.3 + Math.random() * 0.7)
                );
            }, 200);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive]);

    return (
        <div className="waveform-wrapper">
            <div className="waveform-container">
                {heights.map((height, index) => (
                    <div
                        key={index}
                        className={`waveform-bar ${isActive ? 'active' : ''}`}
                        style={{
                            height: `${height * 100}%`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default AudioWaveform;