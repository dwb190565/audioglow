
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface SubsurfaceScatteringBackgroundProps {
  analyser: AnalyserNode | null;
}

const OBJECT_COUNT = 50;
const DUMMY = new THREE.Object3D();

const SubsurfaceScatteringBackground: React.FC<SubsurfaceScatteringBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    const instancedMeshRef = useRef<THREE.InstancedMesh>();
    // Store initial random data for each instance
    const instanceData = useMemo(() => Array.from({ length: OBJECT_COUNT }, () => ({
        random: Math.random(),
        rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
        )
    })), []);


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

        camera.position.z = 80;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Lights ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        scene.add(directionalLight);

        // --- Material to fake SSS ---
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0.8,
            emissive: new THREE.Color(0x000000), 
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.8
        });

        // --- Geometry & Instanced Mesh ---
        const geometry = new THREE.IcosahedronGeometry(5, 3);
        const mesh = new THREE.InstancedMesh(geometry, material, OBJECT_COUNT);

        for (let i = 0; i < OBJECT_COUNT; i++) {
            DUMMY.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
            );
            DUMMY.rotation.set(
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI
            );
            const scale = Math.random() * 0.5 + 0.5;
            DUMMY.scale.set(scale, scale, scale);
            DUMMY.updateMatrix();
            mesh.setMatrixAt(i, DUMMY.matrix);
        }
        instancedMeshRef.current = mesh;
        scene.add(mesh);

        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let bassIntensity = 0;
            let midIntensity = 0;
            let trebleIntensity = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const freqCount = dataArrayRef.current.length;
                bassIntensity = (freqCount > 8 ? dataArrayRef.current.slice(0, 8).reduce((a, b) => a + b, 0) / 8 : 0) / 255;
                midIntensity = (freqCount > 8 ? dataArrayRef.current.slice(8, freqCount / 2).reduce((a, b) => a + b, 0) / (freqCount/2 - 8) : 0) / 255;
                trebleIntensity = (freqCount > 2 ? dataArrayRef.current.slice(freqCount / 2).reduce((a, b) => a + b, 0) / (freqCount/2) : 0) / 255;
            }
            
            if (instancedMeshRef.current) {
                const mesh = instancedMeshRef.current;

                const emissiveColor = new THREE.Color(bassIntensity * 0.8, midIntensity * 0.8, trebleIntensity * 0.8);
                (mesh.material as THREE.MeshStandardMaterial).emissive = emissiveColor;
                (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = (bassIntensity + midIntensity + trebleIntensity) / 3 * 2;
                
                for (let i = 0; i < OBJECT_COUNT; i++) {
                    mesh.getMatrixAt(i, DUMMY.matrix);
                    DUMMY.matrix.decompose(DUMMY.position, DUMMY.quaternion, DUMMY.scale);
                    
                    DUMMY.rotation.x += instanceData[i].rotationSpeed.x;
                    DUMMY.rotation.y += instanceData[i].rotationSpeed.y;
                    DUMMY.rotation.z += instanceData[i].rotationSpeed.z;

                    DUMMY.position.x += Math.sin(time * 0.0001 + i) * 0.1;
                    DUMMY.position.y += Math.cos(time * 0.0001 + i) * 0.1;

                    if (DUMMY.position.length() > 150) {
                        DUMMY.position.setLength(150).negate();
                    }

                    DUMMY.updateMatrix();
                    mesh.setMatrixAt(i, DUMMY.matrix);
                }
                mesh.instanceMatrix.needsUpdate = true;
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
                try { currentMount.removeChild(rendererRef.current.domElement); } catch (e) { /* ignore */ }
            }
            instancedMeshRef.current?.geometry.dispose();
            (instancedMeshRef.current?.material as THREE.Material)?.dispose();
            renderer.dispose();
        };
    }, [scene, camera, analyser, instanceData]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default SubsurfaceScatteringBackground;
