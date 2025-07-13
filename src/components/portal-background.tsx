
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface PortalBackgroundProps {
  analyser: AnalyserNode | null;
}

const PARTICLE_COUNT = 3000;

const PortalBackground: React.FC<PortalBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []); // Use placeholder aspect ratio
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    
    const particlesRef = useRef<THREE.Points>();
    const portalRef = useRef<THREE.Mesh>();
    const particlePositionsRef = useRef<Float32Array>();

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

        camera.position.z = 100;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Portal Mesh
        const portalGeometry = new THREE.TorusGeometry(20, 3, 16, 100);
        const portalMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x6F00FF, 
            wireframe: true, 
            blending: THREE.AdditiveBlending 
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portalRef.current = portal;
        scene.add(portal);

        // Particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const color = new THREE.Color();

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 400;
            positions[i3 + 1] = (Math.random() - 0.5) * 400;
            positions[i3 + 2] = (Math.random() - 0.5) * 400;
            
            color.setHSL(Math.random(), 1.0, 0.5);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlePositionsRef.current = positions;

        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });

        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);

        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let bassIntensity = 0;
            let trebleIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const bassFr = dataArrayRef.current.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                const trebleFr = dataArrayRef.current.slice(dataArrayRef.current.length / 2).reduce((a, b) => a + b, 0) / (dataArrayRef.current.length / 2);
                bassIntensity = bassFr / 255;
                trebleIntensity = trebleFr / 255;
            }

            // Animate Portal
            if (portalRef.current) {
                portalRef.current.rotation.x += 0.001;
                portalRef.current.rotation.y += 0.002;
                portalRef.current.rotation.z += 0.003;
                const scale = 1 + bassIntensity * 0.5;
                portalRef.current.scale.set(scale, scale, scale);
                (portalRef.current.material as THREE.MeshBasicMaterial).color.setHSL(0.7 + bassIntensity * 0.2, 1.0, 0.5);
            }
            
            // Animate Particles
            const positions = particlePositionsRef.current;
            if (positions && particlesRef.current) {
                 const speed = 0.5 + trebleIntensity * 2;
                 for (let i = 0; i < PARTICLE_COUNT; i++) {
                    const i3 = i * 3;
                    const p = new THREE.Vector3(positions[i3], positions[i3+1], positions[i3+2]);
                    
                    // Move towards origin (the portal)
                    p.sub(p.clone().normalize().multiplyScalar(speed));
                    positions[i3] = p.x;
                    positions[i3+1] = p.y;
                    positions[i3+2] = p.z;
                    
                    // If particle reaches center, reset it
                    if (p.length() < 1) {
                         positions[i3] = (Math.random() - 0.5) * 400;
                         positions[i3 + 1] = (Math.random() - 0.5) * 400;
                         positions[i3 + 2] = (Math.random() - 0.5) * 400;
                    }
                 }
                particlesRef.current.geometry.attributes.position.needsUpdate = true;
            }
            
            camera.lookAt(scene.position);
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
            portalRef.current?.geometry.dispose();
            (portalRef.current?.material as THREE.Material)?.dispose();
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

export default PortalBackground;
