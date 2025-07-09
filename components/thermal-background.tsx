"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createNoise3D } from 'simplex-noise';

interface ThermalBackgroundProps {
  analyser: AnalyserNode | null;
}

const CONTOUR_LEVELS = 10;
const RESOLUTION = 8; // Lower is higher quality, but more performance intensive

const ThermalBackground: React.FC<ThermalBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const noise3D = useMemo(() => createNoise3D(), []);
    const timeRef = useRef(0);

    useEffect(() => {
        if (analyser) {
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

        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        setCanvasSize();

        let animationFrameId: number;

        const animate = (timestamp: number) => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.05;
            let bassIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
                bassIntensity = (dataArrayRef.current[2] / 255); // A specific low-frequency bin for more pulse
            }
            
            timeRef.current += (0.0005 + intensity * 0.001);

            if (ctx && canvas) {
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.25 - intensity * 0.2)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = 1.5;

                const cols = Math.floor(canvas.width / RESOLUTION);
                const rows = Math.floor(canvas.height / RESOLUTION);

                for (let i = 0; i < CONTOUR_LEVELS; i++) {
                    const threshold = (i / CONTOUR_LEVELS);
                    const hue = 180 + threshold * 120 + bassIntensity * 60; // From blue to red/pink
                    const lightness = 30 + intensity * 40;
                    ctx.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`;
                    
                    ctx.beginPath();
                    for (let y = 0; y < rows; y++) {
                        for (let x = 0; x < cols; x++) {
                            const noiseVal = (noise3D(x * 0.02, y * 0.02, timeRef.current) + 1) / 2; // Normalize to 0-1
                            
                            if (Math.abs(noiseVal - threshold) < 0.01) { // Draw if close to threshold
                                if(x === 0 && y === 0) {
                                    ctx.moveTo(x * RESOLUTION, y * RESOLUTION);
                                } else {
                                    ctx.lineTo(x * RESOLUTION, y * RESOLUTION);
                                }
                            }
                        }
                    }
                    ctx.stroke();
                }
            }
        };

        const handleResize = () => {
           setCanvasSize();
        }

        window.addEventListener('resize', handleResize);
        animate(0);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser, noise3D]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default ThermalBackground;
