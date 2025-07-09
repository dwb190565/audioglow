
"use client";

import React, { useEffect, useRef } from 'react';

interface GlitchBackgroundProps {
  analyser: AnalyserNode | null;
}

const GLITCH_CHARS = '█▓▒░';
const NORMAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FONT_SIZE = 14;
const LINE_HEIGHT = 16;

const GlitchBackground: React.FC<GlitchBackgroundProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

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
    let lastRenderTime = 0;
    const renderInterval = 1000 / 15;

    const setCanvasSize = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    
    setCanvasSize();

    const renderCanvas = () => {
      let intensity = 0.0;
      if (analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        intensity = (averageFrequency / 255);
      }
      
      const cols = Math.floor(canvas.width / FONT_SIZE);
      const rows = Math.floor(canvas.height / LINE_HEIGHT);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // A faster fade out for glitch
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${FONT_SIZE}px monospace`;
      const opacity = 0.3 + intensity * 0.4;
      const normalHue = 240 + intensity * 60; // Blue to Magenta

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const isGlitching = Math.random() < intensity * 0.3;
          let char;
          if (isGlitching) {
            char = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            ctx.fillStyle = `hsla(300, 100%, 70%, ${opacity})`; // Magenta for glitches
          } else {
            char = NORMAL_CHARS[Math.floor(Math.random() * NORMAL_CHARS.length)];
            ctx.fillStyle = `hsla(${normalHue}, 100%, 70%, ${opacity})`; // Shift from Blue to Magenta
          }
          ctx.fillText(char, x * FONT_SIZE, y * LINE_HEIGHT);
        }
      }
    };

    const animate = (timestamp: number) => {
      if (timestamp - lastRenderTime > renderInterval) {
        renderCanvas();
        lastRenderTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', setCanvasSize);
    animate(0);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
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

export default GlitchBackground;
