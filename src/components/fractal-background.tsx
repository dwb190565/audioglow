"use client";

import React, { useEffect, useRef } from 'react';

interface FractalBackgroundProps {
  analyser: AnalyserNode | null;
}

const MAX_ITERATIONS = 64;

const FractalBackground: React.FC<FractalBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();
    
    // Fractal state
    const zoomRef = useRef(1.0);
    const offsetXRef = useRef(-0.7);
    const offsetYRef = useRef(0.0);
    const hueOffsetRef = useRef(0);

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
        
        let lastRenderTime = 0;

        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth / 4; // Render at lower resolution for performance
            canvas.height = window.innerHeight / 4;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        };

        setCanvasSize();

        const drawFractal = (audioIntensity: number) => {
            if (!canvas || !ctx) return;
            
            const { width, height } = canvas;
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;

            hueOffsetRef.current = (hueOffsetRef.current + audioIntensity * 2) % 360;

            for (let px = 0; px < width; px++) {
                for (let py = 0; py < height; py++) {
                    // Map pixel to complex plane (Mandelbrot set)
                    const cx = (px - width / 2) * 3.5 / (0.5 * zoomRef.current * width) + offsetXRef.current;
                    const cy = (py - height / 2) * 2.0 / (0.5 * zoomRef.current * height) + offsetYRef.current;
        
                    let zx = 0;
                    let zy = 0;
                    let i = 0;
        
                    while (zx * zx + zy * zy < 4 && i < MAX_ITERATIONS) {
                        const xtemp = zx * zx - zy * zy + cx;
                        zy = 2 * zx * zy + cy;
                        zx = xtemp;
                        i++;
                    }

                    const pixelIndex = (py * width + px) * 4;
                    if (i < MAX_ITERATIONS) {
                        const hue = (hueOffsetRef.current + (i / MAX_ITERATIONS) * 360) % 360;
                        const saturation = 100;
                        const lightness = 50 * (0.8 + audioIntensity * 0.4);
                        
                        // Simple HSL to RGB conversion
                        const s = saturation / 100;
                        const l = lightness / 100;
                        const c = (1 - Math.abs(2 * l - 1)) * s;
                        const x2 = c * (1 - Math.abs(((hue / 60) % 2) - 1));
                        const m = l - c / 2;
                        let r = 0, g = 0, b = 0;
                        if (hue >= 0 && hue < 60) { [r, g, b] = [c, x2, 0]; } 
                        else if (hue >= 60 && hue < 120) { [r, g, b] = [x2, c, 0]; } 
                        else if (hue >= 120 && hue < 180) { [r, g, b] = [0, c, x2]; } 
                        else if (hue >= 180 && hue < 240) { [r, g, b] = [0, x2, c]; } 
                        else if (hue >= 240 && hue < 300) { [r, g, b] = [x2, 0, c]; } 
                        else { [r, g, b] = [c, 0, x2]; }
                        
                        data[pixelIndex] = (r + m) * 255;
                        data[pixelIndex + 1] = (g + m) * 255;
                        data[pixelIndex + 2] = (b + m) * 255;
                        data[pixelIndex + 3] = 255;
                    } else {
                        // Point is in the set (black)
                        data[pixelIndex] = 0;
                        data[pixelIndex + 1] = 0;
                        data[pixelIndex + 2] = 0;
                        data[pixelIndex + 3] = 255;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        };

        const animate = (timestamp: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            if (timestamp - lastRenderTime < 33) { // ~30fps cap
                return;
            }
            lastRenderTime = timestamp;

            let intensity = 0.05;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }

            zoomRef.current *= (1.0 + intensity * 0.02);
            // reset zoom if it gets too large to prevent floating point issues
            if (zoomRef.current > 1e12) {
                zoomRef.current = 1.0;
            }
            
            drawFractal(intensity);
        };

        const handleResize = () => {
           setCanvasSize();
        }

        window.addEventListener('resize', handleResize);
        animate(0);

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 -z-10 w-full h-full"
            style={{ imageRendering: 'pixelated' }}
            aria-hidden="true"
        />
    );
};

export default FractalBackground;
