
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createNoise2D } from 'simplex-noise';

interface CharacterFluidBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHARS = '·,./;\'[]\\-=<>?:"{}|!@#$%^&*()_+`~';
const PARTICLE_DENSITY = 1 / 4000; // 1 particle per 4000 pixels

class Particle {
    x: number;
    y: number;
    character: string;
    canvasWidth: number;
    canvasHeight: number;
    color: string;
    
    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.character = CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        this.color = `hsla(${180 + Math.random() * 120}, 100%, 70%, ${Math.random() * 0.5 + 0.3})`;
    }

    draw(context: CanvasRenderingContext2D, fontSize: number) {
        context.fillStyle = this.color;
        context.font = `${fontSize}px monospace`;
        context.fillText(this.character, this.x, this.y);
    }

    update(noise2D: (x: number, y: number) => number, speed: number, flowFieldMagnitude: number, time: number) {
        const angle = noise2D(this.x * 0.001, this.y * 0.001 + time * 0.1) * Math.PI * 2 * flowFieldMagnitude;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        this.x += vx;
        this.y += vy;

        if (this.x > this.canvasWidth) this.x = 0;
        if (this.x < 0) this.x = this.canvasWidth;
        if (this.y > this.canvasHeight) this.y = 0;
        if (this.y < 0) this.y = this.canvasHeight;
    }
}

const CharacterFluidBackground: React.FC<CharacterFluidBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const noise2D = useMemo(() => createNoise2D(), []);
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
            const particleCount = Math.floor(canvas.width * canvas.height * PARTICLE_DENSITY);
            particlesRef.current = [];
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push(new Particle(canvas.width, canvas.height));
            }
        };
        
        setCanvasSize();

        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.1;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }
            
            timeRef.current += intensity * 0.01;
            const speed = 0.5 + intensity * 2;
            const flowFieldMagnitude = 1 + intensity * 2;
            const fontSize = 12 + intensity * 4;

            if (ctx && canvas) {
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.25 - intensity * 0.2)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                particlesRef.current.forEach(particle => {
                    particle.update(noise2D, speed, flowFieldMagnitude, timeRef.current);
                    particle.draw(ctx, fontSize);
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
    }, [analyser, noise2D]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default CharacterFluidBackground;
