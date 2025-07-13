
"use client";

import React, { useState, useEffect } from 'react';

const messages = [
    "> boot OmniverseOS",
    "> loading cognitive modules...",
    "> establishing secure link to Archive Node",
    "> decrypting entoptic layers...",
    "> system integrity: [VERIFIED]",
    "> welcome, observer"
];

const finalMessage = "AudioGlow";

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
    const [lines, setLines] = useState<string[]>([]);
    const [showFinal, setShowFinal] = useState(false);

    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < messages.length) {
                setLines(prev => [...prev, messages[currentIndex]]);
                currentIndex++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setShowFinal(true);
                    setTimeout(onComplete, 1500); 
                }, 500);
            }
        }, 600);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="w-full min-h-screen bg-background text-foreground flex items-center justify-center font-mono p-4">
            <div className="text-left">
                {!showFinal && (
                    <div className="phosphor-glow">
                        {lines.map((line, index) => (
                            <p key={index} className="animate-entry-fade-in">{line}</p>
                        ))}
                    </div>
                )}
                {showFinal && (
                    <div className="text-center animate-entry-fade-in phosphor-glow">
                        <h1 className="text-4xl font-bold tracking-widest uppercase text-primary">{finalMessage}</h1>
                        <span className="inline-block w-3 h-8 bg-accent animate-pulse ml-2" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplashScreen;
