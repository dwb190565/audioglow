
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createNoise2D } from 'simplex-noise';

interface AsciiBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHAR_RAMP = '`_.,-^";:!i*lI?+1tJcvoagdbqpwmZO0QLC#MW&8%B@$';
const FONT_SIZE = 14;
const LINE_HEIGHT = 16;


const AsciiBackground: React.FC<AsciiBackgroundProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const noise2D = useMemo(() => createNoise2D(), []);

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
    };
    
    setCanvasSize();

    const renderCanvas = () => {
      let intensity = 0.15;
      let averageFrequency = 0;
      if (analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        intensity += (averageFrequency / 255) * 2;
      }

      const cols = Math.floor(canvas.width / FONT_SIZE);
      const rows = Math.floor(canvas.height / LINE_HEIGHT);
      const time = performance.now() * 0.0001;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const normalizedIntensity = averageFrequency / 255;
      ctx.font = `${FONT_SIZE}px monospace`;
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const noiseValue = (noise2D(x * 0.04, y * 0.04 - time) + 1) / 2;
          const combinedValue = Math.min(noiseValue * intensity, 1.0);
          const charIndex = Math.floor(combinedValue * (CHAR_RAMP.length - 1));
          const char = CHAR_RAMP[charIndex];
          
          const normalizedX = x / cols; // 0 at left edge, 1 at right
          const hue = 180 + normalizedX * 120; // 180 (cyan) to 300 (magenta)
          const lightness = 40 + normalizedIntensity * 30; // 40% to 70% based on audio
          const opacity = 0.3 + normalizedIntensity * 0.4; // 0.3 to 0.7 based on audio
          
          ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${opacity})`;
          ctx.fillText(char, x * FONT_SIZE, y * LINE_HEIGHT);
        }
      }
    };

    const animate = () => {
      renderCanvas();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', setCanvasSize);
    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
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

export default AsciiBackground;
