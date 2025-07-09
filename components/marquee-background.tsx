
"use client";

import React, { useEffect, useRef } from 'react';

interface MarqueeBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHARS = 'αβγδεζηθικλμνξοπρστυφχψωABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]()<>#&%*+=-_';
const NUM_LAYERS = 10;
const FONT_SIZE = 16;

const generateLine = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
};

class Layer {
    y: number;
    text: string;
    speed: number;
    direction: 1 | -1;
    x: number;
    color: string;

    constructor(y: number, canvasWidth: number) {
        this.y = y;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = (Math.random() * 0.5 + 0.2) * this.direction;
        this.x = Math.random() * canvasWidth;
        this.text = generateLine(Math.floor(canvasWidth / (FONT_SIZE * 0.6)) * 2); // Make it wide
        this.color = `hsla(${180 + Math.random() * 120}, 100%, 70%, ${Math.random() * 0.4 + 0.3})`;
    }

    update(intensity: number, canvasWidth: number) {
        const audioBoost = intensity * 5;
        this.x += this.speed * (1 + audioBoost);

        // Wrap around logic
        const textWidth = this.text.length * FONT_SIZE * 0.6; // Approximate width
        if (this.direction === 1 && this.x > canvasWidth) {
            this.x = -textWidth;
        } else if (this.direction === -1 && this.x < -textWidth) {
            this.x = canvasWidth;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
    }
}

const MarqueeBackground: React.FC<MarqueeBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const layersRef = useRef<Layer[]>([]);

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
            
            layersRef.current = [];
            const layerSpacing = canvas.height / NUM_LAYERS;
            for (let i = 0; i < NUM_LAYERS; i++) {
                layersRef.current.push(new Layer(layerSpacing * i + layerSpacing / 2, canvas.width));
            }
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
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.25 - intensity * 0.2)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = `${FONT_SIZE}px monospace`;

                layersRef.current.forEach(layer => {
                    layer.update(intensity, canvas.width);
                    layer.draw(ctx);
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

export default MarqueeBackground;
