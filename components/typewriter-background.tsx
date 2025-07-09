"use client";

import React, { useEffect, useRef } from 'react';

interface TypewriterBackgroundProps {
  analyser: AnalyserNode | null;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/\\_!?()[]{}<>*+=-';
const FADE_TIME = 2000; // ms, time for characters to fade
const FONT_SIZE = 14;
const LINE_HEIGHT = 16;
const CHAR_WIDTH = 10;

const TypewriterBackground: React.FC<TypewriterBackgroundProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // We store the grid state, including timestamp for fading
  const gridRef = useRef<Array<{ char: string; timestamp: number }>>([]);
  const gridDimensionsRef = useRef({ cols: 0, rows: 0 });

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

    const setCanvasAndGridSize = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const cols = Math.floor(canvas.width / CHAR_WIDTH);
        const rows = Math.floor(canvas.height / LINE_HEIGHT);
        gridDimensionsRef.current = { cols, rows };

        // Initialize or resize the grid
        const newGrid = Array(cols * rows);
        for(let i=0; i < newGrid.length; i++) {
            newGrid[i] = gridRef.current[i] || { char: ' ', timestamp: 0 };
        }
        gridRef.current = newGrid;
    }

    setCanvasAndGridSize();
    window.addEventListener('resize', setCanvasAndGridSize);
    return () => window.removeEventListener('resize', setCanvasAndGridSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;

    const render = (timestamp: number) => {
      let intensity = 0.0;
      if (analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        intensity = averageFrequency / 255;
      }
      
      const totalCharsToType = (Math.random() < 0.1 ? 1 : 0) + Math.floor(intensity * 30);
      
      const grid = gridRef.current;
      if (grid.length > 0) {
          for (let i = 0; i < totalCharsToType; i++) {
              const randomIndex = Math.floor(Math.random() * grid.length);
              const randomChar = CHARS[Math.floor(Math.random() * CHARS.length)];
              if(grid[randomIndex]) {
                grid[randomIndex] = { char: randomChar, timestamp: timestamp };
              }
          }
      }

      // Drawing logic
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Slow fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      const { cols, rows } = gridDimensionsRef.current;
      const hue = 240 + Math.sin(timestamp * 0.0005) * 60; // Oscillates between 180 (cyan) and 300 (magenta)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const index = y * cols + x;
          const cell = grid[index];
          if (cell) {
            const age = timestamp - cell.timestamp;
            if (age < FADE_TIME) {
              const opacity = Math.max(0, 1 - (age / FADE_TIME));
              ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${opacity * 0.7})`;
              ctx.fillText(cell.char, x * CHAR_WIDTH, y * LINE_HEIGHT);
            }
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
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

export default TypewriterBackground;
