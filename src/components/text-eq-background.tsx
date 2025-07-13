
"use client";

import React, { useEffect, useRef } from 'react';

interface TextEqBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHAR = '█';
const FONT_SIZE = 16;
const LINE_HEIGHT = 16;

const TextEqBackground: React.FC<TextEqBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        if (analyser) {
            analyser.fftSize = 256; 
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        } else {
            dataArrayRef.current = null;
        }
    }, [analyser]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        setCanvasSize();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (!analyser || !dataArrayRef.current) {
                if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            };

            analyser.getByteFrequencyData(dataArrayRef.current);
            const frequencyData = dataArrayRef.current;
            
            const charWidth = FONT_SIZE * 0.8; // Estimate width of the block character
            const numBars = Math.floor(canvas.width / charWidth);
            const rows = Math.floor(canvas.height / LINE_HEIGHT);
            const freqBinPerBar = Math.floor(frequencyData.length / numBars);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = `${FONT_SIZE}px monospace`;

            for (let i = 0; i < numBars; i++) {
                const start = i * freqBinPerBar;
                const end = start + freqBinPerBar;
                let sum = 0;
                for (let j = start; j < end; j++) {
                    sum += frequencyData[j];
                }
                const avg = sum / freqBinPerBar || 0;
                const normalizedAvg = avg / 255;
                const barHeightInChars = Math.floor(normalizedAvg * rows);
                
                const hue = 180 + (i / numBars) * 180; // Gradient from Cyan to Magenta
                const lightness = 40 + normalizedAvg * 40; // Brighter for taller bars
                
                ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;

                for (let y = 0; y < barHeightInChars; y++) {
                    const charX = i * charWidth;
                    const charY = canvas.height - y * LINE_HEIGHT;
                    ctx.fillText(CHAR, charX, charY);
                }
            }
        };

        const handleResize = () => {
            setCanvasSize();
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default TextEqBackground;
