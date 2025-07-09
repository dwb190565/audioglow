
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface PunchCardBackgroundProps {
  analyser: AnalyserNode | null;
}

const CARD_COUNT = 100;
const CARD_WIDTH = 40;
const CARD_HEIGHT = 20;
const CARD_SPACING_Z = 25;
const DUMMY = new THREE.Object3D();

const createPunchCardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(document.createElement('canvas'));

    canvas.width = 256;
    canvas.height = 128;

    // Card background
    ctx.fillStyle = '#1a1a2e'; // Dark blue-purple
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Punch holes
    const holeRadius = 8;
    const rows = 5;
    const cols = 10;
    const colors = ['rgba(0, 255, 255, 0.7)', 'rgba(255, 0, 255, 0.7)']; // Cyan, Magenta

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.4) { // Randomly skip some holes
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.beginPath();
                ctx.arc(
                    (c + 1) * (canvas.width / (cols + 1)),
                    (r + 1) * (canvas.height / (rows + 1)),
                    holeRadius,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
    
    return new THREE.CanvasTexture(canvas);
};


const PunchCardBackground: React.FC<PunchCardBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []); // Use placeholder aspect ratio
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    const instancedMeshRef = useRef<THREE.InstancedMesh>();
    const materialRef = useRef<THREE.MeshStandardMaterial>();

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

        camera.position.z = 150;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Material & Geometry ---
        const texture = createPunchCardTexture();
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: new THREE.Color(0x6F00FF), // Electric Indigo
            emissiveMap: texture,
            emissiveIntensity: 0,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        materialRef.current = material;
        
        const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
        const mesh = new THREE.InstancedMesh(geometry, material, CARD_COUNT);

        for (let i = 0; i < CARD_COUNT; i++) {
            DUMMY.position.set(
                (Math.random() - 0.5) * CARD_WIDTH * 1.5,
                (Math.random() - 0.5) * CARD_HEIGHT * 3,
                -i * CARD_SPACING_Z
            );
            DUMMY.rotation.x = Math.random() * 0.1 - 0.05;
            DUMMY.rotation.y = Math.random() * 0.1 - 0.05;
            DUMMY.updateMatrix();
            mesh.setMatrixAt(i, DUMMY.matrix);
        }
        
        instancedMeshRef.current = mesh;
        scene.add(mesh);

        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let intensity = 0.05;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const averageFrequency = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
                intensity = (averageFrequency / 255);
            }
            
            if (instancedMeshRef.current && materialRef.current) {
                const mesh = instancedMeshRef.current;
                const totalZDistance = CARD_COUNT * CARD_SPACING_Z;
                const speed = 1.0 + intensity * 10;
                
                materialRef.current.emissiveIntensity = intensity * 4.0;
                
                for (let i = 0; i < CARD_COUNT; i++) {
                    mesh.getMatrixAt(i, DUMMY.matrix);
                    DUMMY.matrix.decompose(DUMMY.position, DUMMY.quaternion, DUMMY.scale);
                    
                    DUMMY.position.z += speed;

                    // If card goes past camera, loop it to the back
                    if (DUMMY.position.z > camera.position.z) {
                        DUMMY.position.z -= totalZDistance;
                    }

                    DUMMY.updateMatrix();
                    mesh.setMatrixAt(i, DUMMY.matrix);
                }
                mesh.instanceMatrix.needsUpdate = true;
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
                try { currentMount.removeChild(rendererRef.current.domElement); } catch (e) { /* ignore */ }
            }
            instancedMeshRef.current?.geometry.dispose();
            (instancedMeshRef.current?.material as THREE.Material)?.dispose();
            rendererRef.current?.dispose();
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

export default PunchCardBackground;
