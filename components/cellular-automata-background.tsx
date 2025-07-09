
"use client";

import React, { useEffect, useRef } from 'react';

interface CellularAutomataBackgroundProps {
  analyser: AnalyserNode | null;
}

const CELL_SIZE = 10;
const UPDATE_INTERVAL = 100; // ms, speed of simulation

const CellularAutomataBackground: React.FC<CellularAutomataBackgroundProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const gridRef = useRef<number[][]>([]);
    const lastUpdateTimeRef = useRef(0);
    const colsRef = useRef(0);
    const rowsRef = useRef(0);
    const hueRef = useRef(180); // Start with a blue/cyan hue

    useEffect(() => {
        if (analyser) {
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        } else {
            dataArrayRef.current = null;
        }
    }, [analyser]);

    const createGrid = (cols: number, rows: number) => {
        const grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                grid[y][x] = Math.random() > 0.75 ? 1 : 0; // Initial random state
            }
        }
        return grid;
    };
    
    const countNeighbors = (grid: number[][], x: number, y: number, cols: number, rows: number) => {
        let sum = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (i === 0 && j === 0) continue;
                // Wrap around edges (toroidal array)
                const col = (x + j + cols) % cols;
                const row = (y + i + rows) % rows;
                sum += grid[row][col];
            }
        }
        return sum;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            colsRef.current = Math.floor(canvas.width / CELL_SIZE);
            rowsRef.current = Math.floor(canvas.height / CELL_SIZE);
            gridRef.current = createGrid(colsRef.current, rowsRef.current);
        };
        
        setCanvasSize();

        let animationFrameId: number;

        const animate = (timestamp: number) => {
            animationFrameId = requestAnimationFrame(animate);

            let intensity = 0.05;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }

            hueRef.current = (hueRef.current + intensity * 0.5) % 360;

            if (timestamp - lastUpdateTimeRef.current > UPDATE_INTERVAL) {
                lastUpdateTimeRef.current = timestamp;
                
                const nextGrid = gridRef.current.map(arr => [...arr]);
                for (let y = 0; y < rowsRef.current; y++) {
                    for (let x = 0; x < colsRef.current; x++) {
                        const neighbors = countNeighbors(gridRef.current, x, y, colsRef.current, rowsRef.current);
                        const state = gridRef.current[y][x];

                        // Conway's Game of Life rules
                        if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                            nextGrid[y][x] = 0;
                        } else if (state === 0 && neighbors === 3) {
                            nextGrid[y][x] = 1;
                        }

                        // Audio-reactive part: random mutations
                        if (Math.random() < intensity * 0.05) {
                           nextGrid[y][x] = 1 - nextGrid[y][x]; // Flip state
                        }
                    }
                }
                gridRef.current = nextGrid;
            }

            // Drawing part
            if (ctx && canvas) {
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.3 - intensity * 0.25)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                for (let y = 0; y < rowsRef.current; y++) {
                    for (let x = 0; x < colsRef.current; x++) {
                        if (gridRef.current[y][x] === 1) {
                            const lightness = 30 + intensity * 40;
                            const cellHue = (hueRef.current + x + y) % 360;
                            ctx.fillStyle = `hsl(${cellHue}, 100%, ${lightness}%)`;
                            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
                        }
                    }
                }
            }
        };

        const handleResize = () => {
           setCanvasSize();
        }

        window.addEventListener('resize', handleResize);
        animate(0);

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

export default CellularAutomataBackground;
