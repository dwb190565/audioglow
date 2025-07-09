"use client";

import React, { useEffect, useRef } from 'react';

interface LcdBleedBackgroundProps {
  analyser: AnalyserNode | null;
}

const PIXEL_GRID_SPACING = 10;

class BleedSpot {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    growthRate: number;
    hue: number;
    life: number;
    maxLife: number;
    
    constructor(x: number, y: number, hue: number, maxRadius: number) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.growthRate = 0.1 + Math.random() * 0.2;
        this.hue = hue;
        this.maxLife = 200 + Math.random() * 200;
        this.life = this.maxLife;
    }

    update(intensity: number) {
        this.radius += this.growthRate * (1 + intensity * 2);
        this.life--;

        if (this.radius > this.maxRadius) {
            this.radius = this.maxRadius;
        }

        return this.life > 0;
    }

    draw(ctx: CanvasRenderingContext2D, intensity: number) {
        if (this.radius <= 0) return;
        
        // Intensified alpha value
        const alpha = (this.life / this.maxLife) * (0.7 + intensity * 0.3);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 60%, ${alpha})`);
        gradient.addColorStop(0.7, `hsla(${(this.hue + 20) % 360}, 80%, 50%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${(this.hue + 40) % 360}, 80%, 40%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

const LcdBleedBackground: React.FC<LcdBleedBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const bleedsRef = useRef<BleedSpot[]>([]);

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
        
        let animationFrameId: number;

        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            bleedsRef.current = [];
        };

        setCanvasSize();
        
        const drawGrid = (intensity: number) => {
            if (!ctx || !canvas) return;
            // Faint vertical lines
            ctx.strokeStyle = `rgba(128, 128, 128, ${0.02 + intensity * 0.05})`;
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += PIXEL_GRID_SPACING) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
        };

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.05;
            let bassIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                bassIntensity = (dataArrayRef.current.slice(0, 8).reduce((a, b) => a + b, 0) / 8) / 255;
                intensity = (dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length) / 255;
            }

            if (ctx && canvas) {
                // Set a dark, slightly blue/green background like an off LCD
                ctx.fillStyle = '#050a08';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                drawGrid(intensity);
                
                // Spawn new bleeds on strong sounds, more frequently
                if (bassIntensity > 0.4 && Math.random() > 0.5 && bleedsRef.current.length < 100) {
                     const newX = Math.random() * canvas.width;
                     const newY = Math.random() * canvas.height;
                     const newHue = 180 + Math.random() * 120; // Cyan to Magenta
                     // Increased radius
                     const newRadius = (100 + Math.random() * 150) * bassIntensity;
                     bleedsRef.current.push(new BleedSpot(newX, newY, newHue, newRadius));
                }

                ctx.globalCompositeOperation = 'lighter';
                bleedsRef.current = bleedsRef.current.filter(bleed => {
                    const isActive = bleed.update(intensity);
                    if (isActive) {
                        bleed.draw(ctx, intensity);
                        return true;
                    }
                    return false;
                });
                ctx.globalCompositeOperation = 'source-over';
            }
        };

        const handleResize = () => {
            setCanvasSize();
        }
        
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

export default LcdBleedBackground;
