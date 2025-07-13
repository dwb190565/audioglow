"use client";

import React, { useEffect, useRef } from 'react';

interface RootSystemBackgroundProps {
  analyser: AnalyserNode | null;
}

class Root {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    maxSize: number;
    size: number;
    vs: number; // velocity of size change
    angleX: number;
    vax: number; // velocity of angle change for X
    angleY: number;
    vay: number; // velocity of angle change for Y
    lightness: number;
    hue: number;

    constructor(x: number, y: number, hue: number) {
        this.x = x;
        this.y = y;
        this.speedX = 0;
        this.speedY = Math.random() * 2 + 0.5;
        this.maxSize = Math.random() * 7 + 2;
        this.size = Math.random() * 1 + 1;
        this.vs = Math.random() * 0.2 + 0.05;
        this.angleX = Math.random() * 6.2;
        this.vax = Math.random() * 0.6 - 0.3;
        this.angleY = Math.random() * 6.2;
        this.vay = Math.random() * 0.6 - 0.3;
        this.lightness = 10;
        this.hue = hue;
    }

    update(intensity: number, canvasWidth: number, canvasHeight: number) {
        this.x += this.speedX + Math.sin(this.angleX);
        this.y += this.speedY + Math.sin(this.angleY);
        
        this.size += this.vs;
        this.angleX += this.vax;
        this.angleY += this.vay;

        this.lightness = 10 + intensity * 60;
        this.speedY = (Math.random() * 2 + 0.5) * (1 + intensity);

        if (this.size < this.maxSize) {
            const branchingChance = 0.005 + intensity * 0.02;
            if (Math.random() > (1 - branchingChance)) {
                return new Root(this.x, this.y, this.hue);
            }
        }
        
        if (this.y > canvasHeight || this.y < 0 || this.x > canvasWidth || this.x < 0) {
            this.size = -1; // Mark for removal
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.size <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.lightness}%)`;
        ctx.fill();
        ctx.stroke(); // Add a stroke for definition
    }
}


const RootSystemBackground: React.FC<RootSystemBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const rootsRef = useRef<Root[]>([]);
    const hueRef = useRef(200);

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
            rootsRef.current = [];
        };

        setCanvasSize();
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.05;
            let bassIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                bassIntensity = (dataArrayRef.current.slice(0, 5).reduce((a, b) => a + b, 0) / 5) / 255;
                intensity = (dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length) / 255;
            }

            hueRef.current = (200 + bassIntensity * 120) % 360;

            if (ctx && canvas) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';

                if (rootsRef.current.length < 100 * (1 + bassIntensity * 2)) {
                    for(let i = 0; i < 5; i++){
                       rootsRef.current.push(new Root(Math.random() * canvas.width, 0, hueRef.current));
                    }
                }

                const newBranches: Root[] = [];
                rootsRef.current = rootsRef.current.filter(root => {
                    const newRoot = root.update(intensity, canvas.width, canvas.height);
                    if(newRoot) newBranches.push(newRoot);
                    root.draw(ctx);
                    return root.size > 0;
                });
                rootsRef.current.push(...newBranches);
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

export default RootSystemBackground;
