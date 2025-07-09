
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createNoise2D } from 'simplex-noise';

interface SonogramBackgroundProps {
  analyser: AnalyserNode | null;
}

class SonogramTracer {
    x: number;
    y: number;
    vx: number;
    vy: number;
    history: {x: number, y: number}[];
    life: number;
    maxLife: number;
    canvasWidth: number;
    canvasHeight: number;
    
    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.history = [];
        this.maxLife = 50 + Math.random() * 100;
        this.life = this.maxLife;

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1 + 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(noise2D: (x: number, y: number) => number, time: number) {
        const noiseAngle = noise2D(this.x * 0.005, this.y * 0.005 + time) * Math.PI * 4;
        this.vx += Math.cos(noiseAngle) * 0.1;
        this.vy += Math.sin(noiseAngle) * 0.1;
        
        // Dampen velocity
        this.vx *= 0.98;
        this.vy *= 0.98;

        this.x += this.vx;
        this.y += this.vy;
        
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 30) {
            this.history.shift();
        }

        this.life--;

        // Bounce off edges
        if (this.x < 0 || this.x > this.canvasWidth) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvasHeight) this.vy *= -1;

        return this.life > 0;
    }

    draw(ctx: CanvasRenderingContext2D, bass: number, treble: number) {
        if (this.history.length < 2) return;
        
        const hue = 180 + (this.x / this.canvasWidth) * 120; // 180 (cyan) to 300 (magenta)
        const lightness = 40 + bass * 30;
        const alpha = (this.life / this.maxLife) * 0.3 * (0.5 + bass * 0.5);

        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for(let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = 1 + bass * 2;
        ctx.stroke();
    }
}


const SonogramBackground: React.FC<SonogramBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const tracersRef = useRef<SonogramTracer[]>([]);
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
            tracersRef.current = [];
            for (let i = 0; i < 30; i++) {
                tracersRef.current.push(new SonogramTracer(canvas.width, canvas.height));
            }
        };

        setCanvasSize();

        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let bass = 0;
            let treble = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const freqCount = dataArrayRef.current.length;
                bass = (freqCount > 8 ? dataArrayRef.current.slice(0, 8).reduce((a, b) => a + b, 0) / 8 : 0) / 255;
                treble = (freqCount > 2 ? dataArrayRef.current.slice(freqCount / 2).reduce((a, b) => a + b, 0) / (freqCount/2) : 0) / 255;
            }

            timeRef.current += 0.001;

            if (ctx && canvas) {
                ctx.fillStyle = `rgba(4, 16, 36, 0.1)`; // Deep blue background with fade
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'lighter';

                tracersRef.current = tracersRef.current.filter(tracer => {
                    const isActive = tracer.update(noise2D, timeRef.current);
                    if (isActive) {
                        tracer.draw(ctx, bass, treble);
                        return true;
                    }
                    return false;
                });

                // Spawn new tracers to replace dead ones
                while (tracersRef.current.length < 30) {
                     tracersRef.current.push(new SonogramTracer(canvas.width, canvas.height));
                }
                
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
    }, [analyser, noise2D]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 -z-10 bg-[#041024]"
            aria-hidden="true"
        />
    );
};

export default SonogramBackground;
