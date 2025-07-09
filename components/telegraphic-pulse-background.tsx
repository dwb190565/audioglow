
"use client";

import React, { useEffect, useRef } from 'react';

interface TelegraphicPulseBackgroundProps {
  analyser: AnalyserNode | null;
}

const PULSE_LENGTH = 30; // Length of the pulse trail

class Pulse {
    x: number;
    y: number;
    vx: number;
    vy: number;
    history: {x: number, y: number}[];
    canvasWidth: number;
    canvasHeight: number;
    color: string;
    life: number;
    
    constructor(canvasWidth: number, canvasHeight: number, speedMultiplier: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Start from a random edge
        if (Math.random() > 0.5) {
            this.x = Math.random() > 0.5 ? 0 : canvasWidth;
            this.y = Math.random() * canvasHeight;
            this.vx = (this.x === 0 ? 1 : -1) * (Math.random() * 2 + 1) * speedMultiplier;
            this.vy = (Math.random() - 0.5) * 2 * speedMultiplier;
        } else {
            this.x = Math.random() * canvasWidth;
            this.y = Math.random() > 0.5 ? 0 : canvasHeight;
            this.vx = (Math.random() - 0.5) * 2 * speedMultiplier;
            this.vy = (this.y === 0 ? 1 : -1) * (Math.random() * 2 + 1) * speedMultiplier;
        }
        
        this.history = [];
        this.color = `hsl(${180 + Math.random() * 120}, 100%, 70%)`; // Cyan to Indigo/Magenta
        this.life = 100 + Math.random() * 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        this.history.push({x: this.x, y: this.y});
        if (this.history.length > PULSE_LENGTH) {
            this.history.shift();
        }

        this.life--;
        
        return this.life > 0 && this.x > 0 && this.x < this.canvasWidth && this.y > 0 && this.y < this.canvasHeight;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            const gradient = ctx.createLinearGradient(this.history[0].x, this.history[0].y, this.x, this.y);
            gradient.addColorStop(0, "transparent");
            gradient.addColorStop(0.7, this.color);
            gradient.addColorStop(1, this.color);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}

const TelegraphicPulseBackground: React.FC<TelegraphicPulseBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const pulsesRef = useRef<Pulse[]>([]);

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
            pulsesRef.current = [];
        };

        setCanvasSize();

        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.05;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }

            if (ctx && canvas) {
                ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Spawn new pulses based on intensity
                if (Math.random() < intensity * 0.5 && pulsesRef.current.length < 150) {
                    const speedMultiplier = 1 + intensity * 4;
                    pulsesRef.current.push(new Pulse(canvas.width, canvas.height, speedMultiplier));
                }
                
                // Update and draw pulses
                pulsesRef.current = pulsesRef.current.filter(pulse => {
                    const isActive = pulse.update();
                    if(isActive) pulse.draw(ctx);
                    return isActive;
                });
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

export default TelegraphicPulseBackground;
