import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mic, Menu, Volume2 } from 'lucide-react';
import '../styles/Home.css';

const FARMER_IMAGE = `${process.env.PUBLIC_URL}/images/farmer.png`;
const GREETING_AUDIO = `${process.env.PUBLIC_URL}/audio/Namaste.mp3`;
const START_CONVO_AUDIO = `${process.env.PUBLIC_URL}/audio/start_convo.mp3`;

const previousChats = [
    {
        title: "कृषि ऋण आवेदन की जानकारी",
        date: "दिनांक: 12 नवंबर,",
        time: "समय: सुबह 10:30 बजे"
    },
    {
        title: "फसल बीमा पॉलिसी के बारे में पूछत...",
        date: "दिनांक: 5 नवंबर,",
        time: "समय: दोपहर 2:45 बजे"
    },
    {
        title: "बचत खाता खोलने की प्रक्रिया",
        date: "दिनांक: 28 अक्टूबर,",
        time: "समय: शाम 5:15 बजे"
    }
];

const Home = () => {
    const [showChats, setShowChats] = useState(false);
    const [greetingStep, setGreetingStep] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const currentAudioRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const playGreetingAudio = async () => {
            try {
                console.log('Attempting to play Namaste audio from:', GREETING_AUDIO);

                // First play Namaste
                const namasteAudio = new Audio(GREETING_AUDIO);
                console.log('Namaste Audio object created');

                // Add loadeddata event listener
                namasteAudio.addEventListener('loadeddata', () => {
                    console.log('Namaste audio loaded successfully');
                });

                // Add error event listener
                namasteAudio.addEventListener('error', (e) => {
                    console.error('Namaste audio loading error:', e);
                    console.error('Error code:', namasteAudio.error.code);
                    console.error('Error message:', namasteAudio.error.message);
                });

                currentAudioRef.current = namasteAudio;
                setIsSpeaking(true);
                setGreetingStep(1);

                await new Promise((resolve) => {
                    namasteAudio.onended = () => {
                        console.log('Namaste audio finished playing');
                        resolve();
                    };

                    console.log('Attempting to play Namaste audio...');
                    const playPromise = namasteAudio.play();

                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('Error playing Namaste audio:', error);
                        });
                    }
                });

                console.log('Attempting to play start conversation audio from:', START_CONVO_AUDIO);

                // Then play start conversation audio
                const startConvoAudio = new Audio(START_CONVO_AUDIO);
                console.log('Start conversation Audio object created');

                // Add loadeddata event listener for start convo audio
                startConvoAudio.addEventListener('loadeddata', () => {
                    console.log('Start conversation audio loaded successfully');
                });

                // Add error event listener for start convo audio
                startConvoAudio.addEventListener('error', (e) => {
                    console.error('Start conversation audio loading error:', e);
                    console.error('Error code:', startConvoAudio.error.code);
                    console.error('Error message:', startConvoAudio.error.message);
                });

                currentAudioRef.current = startConvoAudio;

                await new Promise((resolve) => {
                    startConvoAudio.onended = () => {
                        console.log('Start conversation audio finished playing');
                        setIsSpeaking(false);
                        setGreetingStep(2);
                        resolve();
                    };

                    console.log('Attempting to play start conversation audio...');
                    const playPromise = startConvoAudio.play();

                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('Error playing start conversation audio:', error);
                        });
                    }
                });
            } catch (error) {
                console.error('Error in playGreetingAudio function:', error);
                setIsSpeaking(false);
                setGreetingStep(2);
            }
        };

        console.log('Setting up initial timer');
        const timer = setTimeout(playGreetingAudio, 1000);

        return () => {
            console.log('Cleanup: clearing timer and stopping audio');
            clearTimeout(timer);
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    const handleMicClick = () => {
        console.log('Mic button clicked');
        const micButton = document.querySelector('.mic-button');
        micButton.classList.add('mic-button-pressed');

        setTimeout(() => {
            console.log('Navigating to voice chat');
            navigate('/voicechat');
        }, 150);
    };

    const handleMenuClick = () => {
        console.log('Menu button clicked, toggling chats');
        setShowChats(!showChats);
        setGreetingStep(2);
    };

    // Rest of the component remains the same
    const renderContent = () => {
        if (greetingStep < 2) {
            return (
                <div className="greeting-overlay">
                    <h1 className={`greeting-text ${greetingStep > 0 ? 'fade-out' : ''}`}>
                        नमस्ते
                    </h1>
                    {greetingStep >= 1 && (
                        <h2 className="greeting-subtitle">
                            माइक बटन दबाएं और सवाल पूछें
                        </h2>
                    )}
                </div>
            );
        }

        return !showChats ? (
            <>
                <div className="header-section">
                    <div className="header-content">
                        <div className="greeting-block">
                            <h1>नमस्ते,</h1>
                            <h2>सोम जी</h2>
                        </div>

                        <div className="profile-picture">
                            <img
                                src={FARMER_IMAGE}
                                alt="Farmer Profile"
                            />
                        </div>
                    </div>
                </div>

                <div className="middle-section">
                    <h3>माइक बटन दबाएं और सवाल पूछें</h3>
                </div>
            </>
        ) : (
            <div className="chats-container">
                <h1 className="chats-title">पिछली चर्चाएँ</h1>
                <div className="chats-list">
                    {previousChats.map((chat, index) => (
                        <div key={index} className="chat-box">
                            <h3 className="chat-title">{chat.title}</h3>
                            <p className="chat-date">{chat.date}</p>
                            <p className="chat-time">{chat.time}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="home-container">
            {renderContent()}

            <div className="bottom-nav">
                <div className="nav-content">
                    <button className="nav-button settings-button">
                        <Settings />
                    </button>

                    <button
                        className="nav-button mic-button"
                        onClick={handleMicClick}
                    >
                        <Mic />
                    </button>

                    <button
                        className={`nav-button menu-button ${showChats ? 'active' : ''}`}
                        onClick={handleMenuClick}
                    >
                        <Menu />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;