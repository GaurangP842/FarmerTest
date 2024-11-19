import React, { useState, useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import MessageWaveform from './MessageWaveform';

const MessageBubble = ({ audioUrl, isUserMessage }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const audioRef = useRef(null);
    const progressIntervalRef = useRef(null);

    useEffect(() => {
        // Initialize audio element when component mounts
        audioRef.current = new Audio(audioUrl);

        // Set up audio event listeners
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            clearInterval(progressIntervalRef.current);
        };

        const handleLoadedMetadata = () => {
            setIsAudioLoaded(true);
        };

        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audioRef.current.pause();
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [audioUrl]);

    const updateProgress = () => {
        if (audioRef.current && !audioRef.current.paused) {
            const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(currentProgress);
        }
    };

    const handlePlayPause = async () => {
        if (!audioRef.current || !isAudioLoaded) return;

        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setProgress(0);
            clearInterval(progressIntervalRef.current);
        } else {
            try {
                await audioRef.current.play();
                // Update progress more frequently for smoother visualization
                progressIntervalRef.current = setInterval(updateProgress, 50);
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        }
        setIsPlaying(!isPlaying);
    };

    const handleWaveformClick = (event) => {
        if (!audioRef.current || !isAudioLoaded || !audioRef.current.duration) return;

        const waveformRect = event.currentTarget.getBoundingClientRect();
        const clickPosition = Math.max(0, Math.min(1, (event.clientX - waveformRect.left) / waveformRect.width));
        const newTime = clickPosition * audioRef.current.duration;

        // Ensure newTime is within valid bounds
        if (isFinite(newTime) && newTime >= 0 && newTime <= audioRef.current.duration) {
            audioRef.current.currentTime = newTime;
            setProgress(clickPosition * 100);

            if (!isPlaying) {
                handlePlayPause();
            }
        }
    };

    const containerStyle = {
        backgroundColor: isUserMessage ? 'rgba(87, 160, 255, 0.2)' : '#E2E2E2',
        padding: '8px 12px',
        borderRadius: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '400px'
    };

    const buttonStyle = {
        background: 'none',
        color: isUserMessage ? 'rgba(87, 160, 255, 1)' : '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        width: '24px',
        height: '24px'
    };

    return (
        <div style={containerStyle}>
            <button
                onClick={handlePlayPause}
                style={buttonStyle}
                disabled={!isAudioLoaded}
            >
                {isPlaying ? (
                    <Square size={18} fill="currentColor" />
                ) : (
                    <Play size={18} fill="currentColor" />
                )}
            </button>
            <div
                onClick={handleWaveformClick}
                style={{ cursor: isAudioLoaded ? 'pointer' : 'default' }}
            >
                <MessageWaveform
                    isActive={isPlaying}
                    lineCount={40}
                    customHeight="32px"
                    customWidth="200px"
                    activeColor={isUserMessage ? 'rgba(87, 160, 255, 1)' : '#000000'}
                    idleColor={isUserMessage ? 'rgba(87, 160, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}
                    progress={progress}
                />
            </div>
        </div>
    );
};

export default MessageBubble;