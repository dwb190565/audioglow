
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

interface RetroGridBackgroundProps {
  analyser: AnalyserNode | null;
}

const RetroGridBackground: React.FC<RetroGridBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 2000), []);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    const gridHelpersRef = useRef<THREE.GridHelper[]>([]);
    const terrainMeshesRef = useRef<THREE.Mesh[]>([]);
    const noise2D = useMemo(() => createNoise2D(), []);

    useEffect(() => {
        if (analyser) {
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        } else {
            dataArrayRef.current = null;
        }
    }, [analyser]);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        camera.position.set(0, 20, 100);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        scene.fog = new THREE.Fog(0x000000, 1, 500);
        
        const planeSize = 2000;

        // --- Shared Geometries and Materials ---
        const terrainGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 100, 100);
        terrainGeometry.rotateX(-Math.PI / 2);
        
        const positions = terrainGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = 30 * noise2D(positions.getX(i) * 0.005, positions.getZ(i) * 0.005);
            positions.setY(i, y);
        }
        
        const terrainMaterial = new THREE.MeshBasicMaterial({
            color: 0x6F00FF, // Electric Indigo
            wireframe: true,
        });

        const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            opacity: 0.2,
            transparent: true
        });

        // --- Create two of each and leapfrog them ---
        gridHelpersRef.current = [];
        terrainMeshesRef.current = [];

        for (let i = 0; i < 2; i++) {
            const grid = new THREE.GridHelper(planeSize, 100, 0x00ffff, 0x00ffff);
            (grid.material as THREE.Material).dispose(); // Dispose default material
            grid.material = gridMaterial;
            grid.position.z = -i * planeSize;
            scene.add(grid);
            gridHelpersRef.current.push(grid);

            const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
            terrain.position.y = -10; // Lower the terrain slightly
            terrain.position.z = -i * planeSize;
            scene.add(terrain);
            terrainMeshesRef.current.push(terrain);
        }

        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let intensity = 0.05;
            let bassIntensity = 0.0;
            
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                intensity = (dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length) / 255;
                bassIntensity = (dataArrayRef.current.length > 8 ? dataArrayRef.current.slice(0, 8).reduce((a, b) => a + b, 0) / 8 : 0) / 255;
            }
            
            // Camera movement
            const speed = 0.5 + bassIntensity * 4;
            camera.position.z -= speed;

            // Pulse colors
            const pulse = 1 + intensity * 2;
            (gridMaterial as THREE.LineBasicMaterial).color.setHSL(0.5, 1.0, 0.5 * Math.min(pulse, 1.5)); // Cyan
            (terrainMaterial as THREE.MeshBasicMaterial).color.setHSL(0.75, 1.0, 0.5 * Math.min(pulse, 1.5)); // Indigo

            // Seamlessly loop grids and terrains
            gridHelpersRef.current.forEach(grid => {
                if (camera.position.z < grid.position.z - planeSize / 2) {
                    grid.position.z -= planeSize * 2;
                }
            });
            terrainMeshesRef.current.forEach(terrain => {
                 if (camera.position.z < terrain.position.z - planeSize / 2) {
                    terrain.position.z -= planeSize * 2;
                }
            });

            renderer.render(scene, camera);
        };
        animate(0);

        const handleResize = () => {
            const currentMount = mountRef.current;
            if (!currentMount || !rendererRef.current) return;
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (currentMount && renderer.domElement) {
                try {
                    currentMount.removeChild(renderer.domElement);
                } catch(e) {
                    // ignore
                }
            }
            terrainGeometry.dispose();
            terrainMaterial.dispose();
            gridMaterial.dispose();
            renderer.dispose();
        };
    }, [scene, camera, noise2D, analyser]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10 bg-black"
            aria-hidden="true"
        />
    );
};

export default RetroGridBackground;
