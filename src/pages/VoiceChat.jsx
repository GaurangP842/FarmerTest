import React, { useState, useEffect, useRef } from 'react';
import { Mic, Disc2, X } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import AudioWaveform from '../components/AudioWaveform';
import MessageBubble from '../components/MessageBubble';
import WaitingMessageBubble from '../components/WaitingMessageBubble';
import '../styles/VoiceChat.css';

const GREETING_AUDIO = `${process.env.PUBLIC_URL}/audio/Namaste.mp3`;
const START_CONVO_AUDIO = `${process.env.PUBLIC_URL}/audio/start_convo.mp3`;
const STOP_CONVO_AUDIO = `${process.env.PUBLIC_URL}/audio/stop_convo.mp3`;
const PLEASE_WAIT_AUDIO = `${process.env.PUBLIC_URL}/audio/please_wait.mp3`;

// Create an audio mapping object
const AUDIO_MAPPING = {
    'नमस्ते': GREETING_AUDIO,
    'मैं आपकी कैसे मदद कर सकता हूं?': START_CONVO_AUDIO,
    'सवाल पूरा करने के लिए लाल बटन दबाएं': STOP_CONVO_AUDIO,
    'कृपया प्रतीक्षा करें': PLEASE_WAIT_AUDIO,
    'माइक बटन दबाएं और सवाल पूछें': START_CONVO_AUDIO,
};

const DEFAULT_MESSAGE_AUDIO = START_CONVO_AUDIO;

const VoiceChat = () => {
    console.log('[VoiceChat] Component initialized');
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([]);
    const [guideText, setGuideText] = useState('');
    const [showWaveform, setShowWaveform] = useState(false);
    const [showMicAnimation, setShowMicAnimation] = useState(false);
    const [micEnabled, setMicEnabled] = useState(true);
    const [isWaiting, setIsWaiting] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [isGreeting, setIsGreeting] = useState(false);
    const [noAudioDetected, setNoAudioDetected] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]); // Will now store flat array of strings

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const noSpeechTimeoutRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const currentTranscriptRef = useRef('');
    const hasAudioInputRef = useRef(false);
    const isRecognitionActiveRef = useRef(false);
    const currentAudioRef = useRef(null);
    const promptTimeoutRef = useRef(null);
    const promptAudioPlayedRef = useRef(false);
    const lastTranscriptUpdateRef = useRef(Date.now());

    useEffect(() => {
        console.log('[VoiceChat] Initial useEffect running');
        // Start recording when component mounts
        startRecordingSession();

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            console.log('[VoiceChat] Setting up SpeechRecognition');
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'hi-IN';

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                console.log('[SpeechRecognition] New transcript:', transcript);
                console.log('[SpeechRecognition] Current transcript:', currentTranscriptRef.current);

                if (transcript !== currentTranscriptRef.current) {
                    console.log('[SpeechRecognition] Transcript updated');
                    lastTranscriptUpdateRef.current = Date.now();
                    currentTranscriptRef.current = transcript;
                    hasAudioInputRef.current = true;
                    setGuideText(''); // Clear guide text when user speaks
                }
            };

            recognitionRef.current.onstart = () => {
                console.log('[SpeechRecognition] Recognition started');
                hasAudioInputRef.current = false;
                isRecognitionActiveRef.current = true;
            };

            recognitionRef.current.onend = () => {
                console.log('[SpeechRecognition] Recognition ended');
                isRecognitionActiveRef.current = false;
                if (isRecording && !isRecognitionActiveRef.current) {
                    try {
                        console.log('[SpeechRecognition] Attempting to restart recognition');
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error('[SpeechRecognition] Error restarting recognition:', error);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('[SpeechRecognition] Recognition error:', event.error);
                if (event.error === 'no-speech' && isRecording) {
                    console.log('[SpeechRecognition] No speech detected, updating state');
                    setNoAudioDetected(true);
                }
            };
        }

        return () => {
            console.log('[VoiceChat] Cleaning up component');
            clearAllTimers();
            stopAllAudio();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    // Check for long silence during recording
    useEffect(() => {
        let silenceCheckInterval;
        if (isRecording) {
            console.log('[VoiceChat] Setting up silence check interval');
            silenceCheckInterval = setInterval(() => {
                const timeSinceLastUpdate = Date.now() - lastTranscriptUpdateRef.current;
                console.log('[SilenceCheck] Time since last update:', timeSinceLastUpdate);
                if (timeSinceLastUpdate > 10000) { // 10 seconds
                    console.log('[SilenceCheck] Long silence detected, updating guide text');
                    setGuideText('सवाल पूरा करने के लिए लाल बटन दबाएं');
                }
            }, 1000);
        }

        return () => {
            if (silenceCheckInterval) {
                console.log('[VoiceChat] Clearing silence check interval');
                clearInterval(silenceCheckInterval);
            }
        };
    }, [isRecording]);

    const clearAllTimers = () => {
        console.log('[VoiceChat] Clearing all timers');
        clearTimeout(noSpeechTimeoutRef.current);
        clearTimeout(inactivityTimerRef.current);
        clearTimeout(promptTimeoutRef.current);
    };

    const stopAllAudio = () => {
        console.log('[Audio] Stopping all audio playback');
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }
        setIsPlayingAudio(false);
    };

    const startRecordingSession = async () => {
        console.log('[Recording] Starting new recording session');
        setIsRecording(true);
        setShowWaveform(true);
        currentTranscriptRef.current = '';
        hasAudioInputRef.current = false;
        lastTranscriptUpdateRef.current = Date.now();
        await startRecording();
    };

    const playAudio = async (text) => {
        console.log('[Audio] Attempting to play audio for text:', text);
        stopAllAudio();

        try {
            const audioPath = AUDIO_MAPPING[text] || DEFAULT_MESSAGE_AUDIO;
            console.log('[Audio] Using audio path:', audioPath);

            const audio = new Audio(audioPath);
            currentAudioRef.current = audio;

            // Add loadedmetadata event listener
            await new Promise((resolve, reject) => {
                audio.addEventListener('loadedmetadata', () => {
                    console.log('[Audio] Audio metadata loaded successfully');
                    resolve();
                });
                audio.addEventListener('error', (error) => {
                    console.error('[Audio] Error loading audio:', error);
                    reject(error);
                });
            });

            setIsPlayingAudio(true);

            try {
                await audio.play();
                return new Promise((resolve) => {
                    audio.onended = () => {
                        console.log('[Audio] Audio playback completed');
                        setIsPlayingAudio(false);
                        currentAudioRef.current = null;
                        resolve();
                    };
                });
            } catch (error) {
                console.error('[Audio] Error during audio playback:', error);
                setIsPlayingAudio(false);
                currentAudioRef.current = null;
                return Promise.resolve();
            }
        } catch (error) {
            console.error('[Audio] Error in playAudio function:', error);
            setIsPlayingAudio(false);
            return Promise.resolve();
        }
    };

    const startInactivityTimer = () => {
        console.log('[Timer] Starting inactivity timer');
        clearTimeout(promptTimeoutRef.current);
        promptAudioPlayedRef.current = false;

        promptTimeoutRef.current = setTimeout(() => {
            console.log('[Timer] Inactivity timer triggered');
            if (!isRecording && !isPlayingAudio) {
                console.log('[Timer] Showing mic animation and updating guide text');
                setShowMicAnimation(true);
                setGuideText('माइक बटन दबाएं और सवाल पूछें');
                if (!promptAudioPlayedRef.current) {
                    console.log('[Timer] Playing prompt audio');
                    playAudio('माइक बटन दबाएं और सवाल पूछें');
                    promptAudioPlayedRef.current = true;
                }
            }
        }, 10000);
    };

    const handleMicClick = async () => {
        console.log('[MicButton] Mic button clicked. Current state:', { isRecording, micEnabled });
        if (!micEnabled) return;

        stopAllAudio();
        clearAllTimers();
        setShowMicAnimation(false);
        setNoAudioDetected(false);
        promptAudioPlayedRef.current = false;

        if (isRecording) {
            console.log('[MicButton] Stopping recording');
            setIsRecording(false);
            setShowWaveform(false);
            await stopRecognition();
            const audioUrl = await stopRecording();

            if (currentTranscriptRef.current && currentTranscriptRef.current.trim()) {
                console.log('[MicButton] Processing recorded audio with transcript:', currentTranscriptRef.current);
                const audioBlob = audioUrl ? await fetch(audioUrl).then(r => r.blob()) : null;

                setMessages(prev => [...prev, {
                    isUser: true,
                    audioUrl: audioUrl || DEFAULT_MESSAGE_AUDIO,
                    text: currentTranscriptRef.current
                }]);

                setIsWaiting(true);
                setGuideText('कृपया प्रतीक्षा करें');
                await playAudio('कृपया प्रतीक्षा करें');
                setMicEnabled(false);

                try {
                    console.log('[AI] Getting AI response');
                    setShowWaveform(true); // Show waveform before playing response
                    const response = await getAIResponse(currentTranscriptRef.current, audioBlob);
                    console.log('[AI] Received response:', response);
                    setIsWaiting(false);
                    setGuideText('');
                    setMicEnabled(true);
                    setShowWaveform(false);

                    setMessages(prev => [...prev, {
                        isUser: false,
                        audioUrl: response.audioUrl,
                        text: response.text
                    }]);

                    startInactivityTimer();
                } catch (error) {
                    console.error('[AI] Error processing AI response:', error);
                    setIsWaiting(false);
                    setMicEnabled(true);
                    setShowWaveform(false);
                    startInactivityTimer();
                }
            } else {
                console.log('[MicButton] No speech detected');
                toast.warning('No speech detected. Please try again.', {
                    position: "top-center",
                    autoClose: 3000
                });
                startInactivityTimer();
            }

            currentTranscriptRef.current = '';
        } else {
            console.log('[MicButton] Starting new recording session');
            await startRecordingSession();
        }
    };

    const handleClose = () => {
        console.log('[VoiceChat] Closing voice chat');
        stopAllAudio();
        clearAllTimers();
        navigate('/');
    };

    const startRecording = async () => {
        console.log('[Recording] Attempting to start recording');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[Recording] Got media stream');
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log('[Recording] Audio data chunk received:', event.data.size, 'bytes');
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            console.log('[Recording] MediaRecorder started');
            await startRecognition();
        } catch (error) {
            console.error('[Recording] Error starting recording:', error);
            toast.error('Error accessing microphone');
        }
    };

    const stopRecording = async () => {
        console.log('[Recording] Stopping recording');
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.onstop = () => {
                    console.log('[Recording] MediaRecorder stopped');
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    console.log('[Recording] Audio URL created:', audioUrl);
                    resolve(audioUrl);
                };
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            } else {
                console.log('[Recording] MediaRecorder was not recording');
                resolve(null);
            }
        });
    };

    const startRecognition = async () => {
        try {
            if (!isRecognitionActiveRef.current) {
                console.log('[Recognition] Starting speech recognition');
                await recognitionRef.current.start();
                console.log('[Recognition] Recognition started successfully');
            }
        } catch (error) {
            console.error('[Recognition] Error starting recognition:', error);
        }
    };

    const stopRecognition = async () => {
        try {
            if (isRecognitionActiveRef.current) {
                console.log('[Recognition] Stopping speech recognition');
                await recognitionRef.current.stop();
                console.log('[Recognition] Recognition stopped successfully');
            }
        } catch (error) {
            console.error('[Recognition] Error stopping recognition:', error);
        }
    };

    // Modified getElevenLabsAudio function
    const getElevenLabsAudio = async (text) => {
        console.log('[ElevenLabs] Getting audio for text:', text);
        try {
            const audioPath = AUDIO_MAPPING[text] || DEFAULT_MESSAGE_AUDIO;
            console.log('[ElevenLabs] Using audio path:', audioPath);
            return audioPath;
        } catch (error) {
            console.error('[ElevenLabs] Error getting audio:', error);
            return DEFAULT_MESSAGE_AUDIO;
        }
    };

    // Modified getAIResponse function with improved audio handling
    const getAIResponse = async (transcript, audioBlob) => {
        console.log('[AI] Starting AI response request');

        try {
            // Send history as flat array of strings
            console.log('[AI] Current conversation history:', conversationHistory);

            const aiResponse = await fetch('http://34.132.178.131:8000/ask/icici', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: transcript,
                    platform: "demo",
                    history: conversationHistory
                }),
            });

            if (!aiResponse.ok) {
                throw new Error(`Failed to get AI response: ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            const aiGeneratedText = aiData.answer;
            const newContext = aiData.context;

            // Update conversation history as flat array
            setConversationHistory(prev => [
                ...prev,
                transcript,    // Add question
                newContext,    // Add context
                aiGeneratedText // Add answer
            ]);

            try {
                const audioResponse = await fetch(
                    `http://34.132.178.131:8000/stream_audio?text=${encodeURIComponent(aiGeneratedText)}`,
                    {
                        headers: {
                            'Accept': 'audio/mpeg',
                        }
                    }
                );

                if (!audioResponse.ok) {
                    throw new Error(`Failed to get audio stream: ${audioResponse.status}`);
                }

                const audioBlob = await audioResponse.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                return {
                    text: aiGeneratedText,
                    audioUrl: audioUrl
                };
            } catch (audioError) {
                console.error('[AI] Error getting audio stream:', audioError);
                return {
                    text: aiGeneratedText,
                    audioUrl: DEFAULT_MESSAGE_AUDIO
                };
            }
        } catch (error) {
            console.error('[AI] Error in getAIResponse:', error);
            return {
                text: "क्षमा करें, एक त्रुटि हुई। कृपया फिर से प्रयास करें।",
                audioUrl: DEFAULT_MESSAGE_AUDIO
            };
        }
    };

    useEffect(() => {
        console.log('[Messages] Scrolling to bottom of messages');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    console.log('[VoiceChat] Rendering with state:', {
        isRecording,
        showWaveform,
        micEnabled,
        isWaiting,
        isPlayingAudio,
        messagesCount: messages.length,
        guideText
    });

    return (
        <div className="voice-chat-container">
            <div className="messages-container">
                {messages.map((message, index) => (
                    <div key={index} className={`message-wrapper ${message.isUser ? 'user-message' : 'ai-message'}`}>
                        <MessageBubble
                            audioUrl={message.audioUrl}
                            isUserMessage={message.isUser}
                            text={message.text}
                            isDisabled={isRecording || isPlayingAudio}
                            onPlay={() => {
                                stopAllAudio();
                                clearAllTimers();
                                setShowMicAnimation(false);
                                setGuideText('');
                            }}
                            onEnded={() => {
                                startInactivityTimer();
                            }}
                        />
                    </div>
                ))}
                {isWaiting && (
                    <div className="message-wrapper ai-message">
                        <WaitingMessageBubble />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bottom-container">
                {(showWaveform && (isRecording || isGreeting || isPlayingAudio)) && (
                    <div className={`waveform-container ${isGreeting ? 'greeting' : ''}`}>
                        <AudioWaveform isActive={true} />
                    </div>
                )}

                {guideText && (
                    <div className="guide-text">
                        {guideText}
                    </div>
                )}

                <div className="button-container">
                    <button
                        className={`mic-button ${isRecording ? 'recording' : micEnabled ? 'active' : 'disabled'}`}
                        onClick={handleMicClick}
                        disabled={!micEnabled}
                    >
                        {isRecording ? (
                            <Disc2 size={24} color="white" />
                        ) : (
                            <Mic size={24} color="white" />
                        )}
                        {showMicAnimation && (
                            <div className="mic-location-animation">
                                <div className="mic-location-circle" />
                                <div className="mic-location-circle" />
                                <div className="mic-location-circle" />
                            </div>
                        )}
                    </button>

                    {!isRecording && (
                        <button
                            className="close-button"
                            onClick={handleClose}
                        >
                            <X size={24} color="white" />
                        </button>
                    )}
                </div>
            </div>

            <ToastContainer limit={1} />
        </div>
    );
};

export default VoiceChat;