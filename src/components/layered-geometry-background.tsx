"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface LayeredGeometryBackgroundProps {
  analyser: AnalyserNode | null;
}

const SHAPE_COUNT_PER_LAYER = 30;
const DUMMY = new THREE.Object3D();

const LayeredGeometryBackground: React.FC<LayeredGeometryBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.OrthographicCamera(0, 0, 0, 0, 1, 1000), []);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    const layersRef = useRef<{
        mesh: THREE.InstancedMesh,
        initialData: { rotationSpeed: number, scale: number }[]
    }[]>([]);

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

        const setCameraSize = () => {
            if (!camera || !currentMount) return;
            camera.left = -currentMount.clientWidth / 2;
            camera.right = currentMount.clientWidth / 2;
            camera.top = currentMount.clientHeight / 2;
            camera.bottom = -currentMount.clientHeight / 2;
            camera.updateProjectionMatrix();
        }

        camera.position.z = 100;
        setCameraSize();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Define Geometries and Materials ---
        const geometries = [
            new THREE.CircleGeometry(20, 32),
            new THREE.PlaneGeometry(30, 30),
            new THREE.ShapeGeometry(new THREE.Shape([
                new THREE.Vector2(-15, -15),
                new THREE.Vector2(15, -15),
                new THREE.Vector2(0, 20)
            ]))
        ];

        const blendModes = [
            THREE.AdditiveBlending,
            THREE.MultiplyBlending,
            THREE.NormalBlending
        ];
        
        const colors = [
            new THREE.Color(0x6F00FF), // Electric Indigo
            new THREE.Color(0x00FFFF), // Cyan
            new THREE.Color(0xFF007F)  // Magenta
        ]

        layersRef.current = [];

        for(let i = 0; i < 3; i++) { // Create 3 layers
            const geometry = geometries[i % geometries.length];
            const material = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 0.5,
                blending: blendModes[i % blendModes.length],
                depthWrite: false
            });

            const mesh = new THREE.InstancedMesh(geometry, material, SHAPE_COUNT_PER_LAYER);
            const initialData: { rotationSpeed: number, scale: number }[] = [];

            for (let j = 0; j < SHAPE_COUNT_PER_LAYER; j++) {
                DUMMY.position.set(
                    (Math.random() - 0.5) * currentMount.clientWidth * 1.2,
                    (Math.random() - 0.5) * currentMount.clientHeight * 1.2,
                    (Math.random() - 0.5) * 50
                );
                DUMMY.rotation.z = Math.random() * 2 * Math.PI;
                const scale = Math.random() * 0.5 + 0.5;
                DUMMY.scale.set(scale, scale, scale);
                DUMMY.updateMatrix();
                mesh.setMatrixAt(j, DUMMY.matrix);
                initialData.push({
                    rotationSpeed: (Math.random() - 0.5) * 0.01,
                    scale: scale
                });
            }
            scene.add(mesh);
            layersRef.current.push({ mesh, initialData });
        }


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
            
            const intensities = [bassIntensity, midIntensity, trebleIntensity];

            layersRef.current.forEach((layer, layerIndex) => {
                const layerIntensity = intensities[layerIndex % intensities.length];
                const { mesh, initialData } = layer;

                (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + layerIntensity * 0.5;

                for (let i = 0; i < SHAPE_COUNT_PER_LAYER; i++) {
                    mesh.getMatrixAt(i, DUMMY.matrix);
                    DUMMY.matrix.decompose(DUMMY.position, DUMMY.quaternion, DUMMY.scale);
                    
                    DUMMY.rotation.z += initialData[i].rotationSpeed * (1 + layerIntensity * 5);
                    const newScale = initialData[i].scale * (1 + layerIntensity * 0.5);
                    DUMMY.scale.set(newScale, newScale, newScale);

                    DUMMY.updateMatrix();
                    mesh.setMatrixAt(i, DUMMY.matrix);
                }
                mesh.instanceMatrix.needsUpdate = true;
            });

            renderer.render(scene, camera);
        };
        animate(0);

        const handleResize = () => {
            const currentMount = mountRef.current;
            if (!currentMount || !rendererRef.current) return;
            setCameraSize();
            rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (currentMount && rendererRef.current?.domElement) {
                try { currentMount.removeChild(rendererRef.current.domElement); } catch (e) { /* ignore */ }
            }
            layersRef.current.forEach(layer => {
                layer.mesh.geometry.dispose();
                (layer.mesh.material as THREE.Material).dispose();
            });
            rendererRef.current?.dispose();
            geometries.forEach(g => g.dispose());
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

export default LayeredGeometryBackground;
