"use client";

import React, { useEffect, useRef } from 'react';

interface GlyphRainBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHARS = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const FONT_SIZE = 16;
const NUM_GLYPHS_PER_SOURCE = 150;

class Glyph {
    x: number;
    y: number;
    vx: number;
    vy: number;
    character: string;
    canvasWidth: number;
    canvasHeight: number;
    color: string;

    constructor(sourceX: number, sourceY: number, vx: number, vy: number, canvasWidth: number, canvasHeight: number, color: string) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = sourceX;
        this.y = sourceY;
        this.vx = vx;
        this.vy = vy;
        this.character = CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        this.color = color;
    }

    update(speedMultiplier: number) {
        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;

        if (this.y > this.canvasHeight || this.y < 0 || this.x > this.canvasWidth || this.x < 0) {
            // Reset logic will be handled outside
            return false; // Inactive
        }
        return true; // Active
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillText(this.character, this.x, this.y);
        // Change character occasionally
        if (Math.random() > 0.98) {
            this.character = CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
    }
}


const GlyphRainBackground: React.FC<GlyphRainBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const glyphsRef = useRef<Glyph[]>([]);
    
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
            glyphsRef.current = [];
            
            // Pre-populate glyphs, but they will be reset to sources later
            for (let i = 0; i < NUM_GLYPHS_PER_SOURCE * 2; i++) {
                glyphsRef.current.push(new Glyph(0, 0, 0, 0, canvas.width, canvas.height, ''));
            }
        };

        setCanvasSize();

        const resetGlyph = (glyph: Glyph, type: 'treble' | 'bass') => {
             if (!canvas) return;
             const { width, height } = canvas;
             glyph.canvasWidth = width;
             glyph.canvasHeight = height;

             if (type === 'treble') { // Top-left source
                glyph.x = Math.random() * width * 0.2;
                glyph.y = Math.random() * height * 0.2;
                glyph.vx = Math.random() * 2 + 1; // Rightwards
                glyph.vy = Math.random() * 2 + 1; // Downwards
                glyph.color = `hsla(300, 100%, 70%, ${Math.random() * 0.5 + 0.5})`; // Magenta/Pink
             } else { // Bass source, bottom-right
                glyph.x = width - Math.random() * width * 0.2;
                glyph.y = height - Math.random() * height * 0.2;
                glyph.vx = -(Math.random() * 2 + 1); // Leftwards
                glyph.vy = -(Math.random() * 2 + 1); // Upwards
                glyph.color = `hsla(180, 100%, 70%, ${Math.random() * 0.5 + 0.5})`; // Cyan
             }
        }
        
        // Initial reset
        glyphsRef.current.forEach((glyph, i) => {
             resetGlyph(glyph, i < NUM_GLYPHS_PER_SOURCE ? 'treble' : 'bass');
        });
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            let bassIntensity = 0;
            let trebleIntensity = 0;
            
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const freqCount = dataArrayRef.current.length;
                bassIntensity = (freqCount > 8 ? dataArrayRef.current.slice(0, 8).reduce((a, b) => a + b, 0) / 8 : 0) / 255;
                trebleIntensity = (freqCount > 2 ? dataArrayRef.current.slice(freqCount / 2).reduce((a, b) => a + b, 0) / (freqCount/2) : 0) / 255;
            }

            if (ctx && canvas) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = `${FONT_SIZE}px monospace`;

                glyphsRef.current.forEach((glyph, i) => {
                    const type = i < NUM_GLYPHS_PER_SOURCE ? 'treble' : 'bass';
                    const intensity = type === 'treble' ? trebleIntensity : bassIntensity;
                    const speedMultiplier = 1 + intensity * 4;

                    const isActive = glyph.update(speedMultiplier);
                    if (!isActive) {
                        resetGlyph(glyph, type);
                    }
                    glyph.draw(ctx);
                });
            }
        };

        const handleResize = () => {
            setCanvasSize();
            // Also re-initialize the glyphs for new canvas dimensions
            glyphsRef.current.forEach((glyph, i) => {
                resetGlyph(glyph, i < NUM_GLYPHS_PER_SOURCE ? 'treble' : 'bass');
            });
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

export default GlyphRainBackground;
