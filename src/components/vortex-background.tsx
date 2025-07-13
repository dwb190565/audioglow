
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface VortexBackgroundProps {
  analyser: AnalyserNode | null;
}

const PARTICLE_COUNT = 5000;

const VortexBackground: React.FC<VortexBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []); // Use placeholder aspect ratio
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    
    const particlesRef = useRef<THREE.Points>();
    const particlePositionsRef = useRef<Float32Array>();
    const particleVelocitiesRef = useRef<Float32Array>();

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

        camera.position.z = 300;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const velocities = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);

        const color = new THREE.Color();

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const radius = Math.random() * 300 + 50;
            const theta = Math.random() * Math.PI * 2;
            
            positions[i3] = radius * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(theta);
            positions[i3 + 2] = (Math.random() - 0.5) * 400;

            velocities[i3] = 0; // vx
            velocities[i3 + 1] = 0; // vy
            velocities[i3 + 2] = Math.random() * 0.5 + 0.2; // vz (towards camera)

            color.setHSL((positions[i3 + 2] / 400) + 0.5, 0.8, 0.6);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlePositionsRef.current = positions;
        particleVelocitiesRef.current = velocities;

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        });

        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);


        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let intensity = 0.05;
            let bassIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                bassIntensity = (dataArrayRef.current.slice(0, 5).reduce((a, b) => a + b, 0) / 5) / 255;
                intensity = (dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length) / 255;
            }

            const positions = particlePositionsRef.current;
            const velocities = particleVelocitiesRef.current;

            if (positions && velocities && particlesRef.current) {
                const rotationSpeed = 0.0005 + bassIntensity * 0.005;

                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    const i3 = i * 3;
                    
                    // Update z position
                    positions[i3 + 2] += velocities[i3 + 2];

                    // Vortex rotation
                    const x = positions[i3];
                    const y = positions[i3 + 1];
                    positions[i3] = x * Math.cos(rotationSpeed) - y * Math.sin(rotationSpeed);
                    positions[i3 + 1] = x * Math.sin(rotationSpeed) + y * Math.cos(rotationSpeed);

                    // Pull towards center
                    const radius = Math.sqrt(positions[i3]**2 + positions[i3+1]**2);
                    const pullFactor = 0.005 + intensity * 0.05;
                    positions[i3] *= (1 - pullFactor / radius);
                    positions[i3+1] *= (1 - pullFactor / radius);

                    // Reset particle if it goes too far or gets too close to center
                    if (positions[i3 + 2] > camera.position.z || radius < 1) {
                         const newRadius = Math.random() * 300 + 50;
                         const theta = Math.random() * Math.PI * 2;
            
                        positions[i3] = newRadius * Math.cos(theta);
                        positions[i3 + 1] = newRadius * Math.sin(theta);
                        positions[i3 + 2] = -400; // start from far back
                    }
                }
                particlesRef.current.geometry.attributes.position.needsUpdate = true;
            }
            
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
    }, [scene, camera, analyser]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default VortexBackground;
