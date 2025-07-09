
"use client";

import React, { useEffect, useRef } from 'react';

interface WaterfallBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:",.<>?/`~';

class Particle {
    x: number;
    y: number;
    character: string;
    speed: number;
    directionX: number;
    directionY: number;
    canvasWidth: number;
    canvasHeight: number;
    fontSize: number;
    color: string;
    
    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.character = CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        this.speed = Math.random() * 3 + 1;
        this.directionX = (Math.random() * 2 - 1);
        this.directionY = Math.random() * 0.5 + 0.5; // Mostly downwards
        this.fontSize = 12;
        this.color = `hsla(${180 + Math.random() * 120}, 100%, 70%, ${Math.random() * 0.5 + 0.3})`;
    }

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.color;
        context.font = `${this.fontSize}px monospace`;
        context.fillText(this.character, this.x, this.y);
    }

    update(intensity: number) {
        this.y += this.speed * this.directionY;
        this.x += this.directionX * (intensity * 2);

        if (this.y > this.canvasHeight) {
            this.y = 0;
            this.x = Math.random() * this.canvasWidth;
        }
        if (this.x > this.canvasWidth || this.x < 0) {
            this.directionX *= -1;
        }

        // Explode on high intensity
        if (intensity > 0.8 && Math.random() > 0.95) {
             this.directionX = (Math.random() * 6 - 3);
             this.directionY = (Math.random() * 6 - 3);
        } else if (Math.random() > 0.99) { // Reset direction occasionally
            this.directionX = (Math.random() * 2 - 1);
            this.directionY = Math.random() * 0.5 + 0.5;
        }
    }
}

const WaterfallBackground: React.FC<WaterfallBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const particlesRef = useRef<Particle[]>([]);

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
            const particleCount = (canvas.width * canvas.height) / 8000;
            particlesRef.current = [];
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push(new Particle(canvas.width, canvas.height));
            }
        };
        
        setCanvasSize();

        let animationFrameId: number;

        const animate = () => {
            let intensity = 0.1;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }

            if (ctx && canvas) {
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.25 - intensity * 0.2)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                particlesRef.current.forEach(particle => {
                    particle.update(intensity);
                    particle.draw(ctx);
                });
            }

            animationFrameId = requestAnimationFrame(animate);
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

export default WaterfallBackground;
