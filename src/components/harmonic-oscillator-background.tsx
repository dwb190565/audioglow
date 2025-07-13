
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface HarmonicOscillatorBackgroundProps {
  analyser: AnalyserNode | null;
}

const GRID_SIZE = 50; // 50x50 grid
const PARTICLE_SPACING = 5;

const HarmonicOscillatorBackground: React.FC<HarmonicOscillatorBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(60, 1, 0.1, 1000), []); // Use placeholder aspect ratio
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    
    const particlesRef = useRef<THREE.Points>();
    const particlePositionsRef = useRef<Float32Array>();
    const clock = useMemo(() => new THREE.Clock(), []);

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

        camera.position.set(0, 50, 150);
        camera.lookAt(scene.position);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
        const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
        const color = new THREE.Color();

        let i = 0;
        for (let ix = 0; ix < GRID_SIZE; ix++) {
            for (let iy = 0; iy < GRID_SIZE; iy++) {
                const i3 = i * 3;
                positions[i3] = ix * PARTICLE_SPACING - ((GRID_SIZE * PARTICLE_SPACING) / 2);
                positions[i3 + 1] = 0; // y position will be animated
                positions[i3 + 2] = iy * PARTICLE_SPACING - ((GRID_SIZE * PARTICLE_SPACING) / 2);

                color.setHSL(0.6, 1.0, 0.5); // Start with a blue color
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
                i++;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlePositionsRef.current = positions;

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });

        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);

        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let bassIntensity = 0.1;
            let trebleIntensity = 0.1;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const lowerHalf = dataArrayRef.current.slice(0, dataArrayRef.current.length / 4);
                const upperHalf = dataArrayRef.current.slice(dataArrayRef.current.length / 2);
                bassIntensity = lowerHalf.length > 0 ? (lowerHalf.reduce((a, b) => a + b, 0) / lowerHalf.length) / 255 : 0.1;
                trebleIntensity = upperHalf.length > 0 ? (upperHalf.reduce((a, b) => a + b, 0) / upperHalf.length) / 255 : 0.1;
            }

            const positions = particlePositionsRef.current;
            const colors = particlesRef.current?.geometry.attributes.color.array as Float32Array;

            if (positions && particlesRef.current) {
                const time = clock.getElapsedTime();
                const waveSpeed = 1 + trebleIntensity * 5;
                const waveFrequency = 0.1 + trebleIntensity * 0.2;
                const waveAmplitude = bassIntensity * 40;
                
                let i = 0;
                for (let ix = 0; ix < GRID_SIZE; ix++) {
                    for (let iy = 0; iy < GRID_SIZE; iy++) {
                        const i3 = i * 3;
                        const dist = Math.sqrt(
                           (ix - GRID_SIZE / 2) ** 2 + (iy - GRID_SIZE / 2) ** 2
                        );
                        
                        // Calculate y position based on waves from center
                        positions[i3 + 1] = Math.sin(dist * waveFrequency - time * waveSpeed) * waveAmplitude;
                        
                        // Update color based on height, preventing division by zero
                        const height = waveAmplitude > 0 ? (positions[i3 + 1] / waveAmplitude + 1) / 2 : 0.5;
                        color.setHSL(0.5 + height * 0.3, 1.0, 0.5);
                        colors[i3] = color.r;
                        colors[i3 + 1] = color.g;
                        colors[i3 + 2] = color.b;

                        i++;
                    }
                }
                particlesRef.current.geometry.attributes.position.needsUpdate = true;
                particlesRef.current.geometry.attributes.color.needsUpdate = true;
            }
            
            scene.rotation.y += 0.0005;

            renderer.render(scene, camera);
        };
        animate();

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
            if (currentMount && rendererRef.current?.domElement) {
                try {
                    currentMount.removeChild(rendererRef.current.domElement);
                } catch(e) {
                    // ignore
                }
            }
            particlesRef.current?.geometry.dispose();
            (particlesRef.current?.material as THREE.Material)?.dispose();
            renderer.dispose();
        };
    }, [scene, camera, clock, analyser]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default HarmonicOscillatorBackground;
