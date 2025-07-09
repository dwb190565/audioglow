
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ShardFieldBackgroundProps {
  analyser: AnalyserNode | null;
}

const ShardFieldBackground: React.FC<ShardFieldBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []); // Use placeholder aspect ratio
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    const shardsRef = useRef<THREE.InstancedMesh>();
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const count = 300;
    
    // Use a single color instance to avoid creating new objects in the loop
    const baseColor1 = useMemo(() => new THREE.Color(0xFF00FF), []); // Magenta
    const baseColor2 = useMemo(() => new THREE.Color(0x00FFFF), []); // Cyan
    const mixedColor = useMemo(() => new THREE.Color(), []);


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

        camera.position.z = 50;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Shards
        const geometry = new THREE.PlaneGeometry(1, 4);
        // Change to MeshBasicMaterial which does not require lights
        const material = new THREE.MeshBasicMaterial({
            color: 0x333333, // Start with a dim color
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, // Make colors pop
            transparent: true,
        });
        const shards = new THREE.InstancedMesh(geometry, material, count);
        
        for (let i = 0; i < count; i++) {
            dummy.position.set(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 100
            );
            dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            dummy.updateMatrix();
            shards.setMatrixAt(i, dummy.matrix);
        }
        scene.add(shards);
        shardsRef.current = shards;


        const animate = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(animate);
            
            let bassFr = 0;
            let treFr = 0;

            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                const lowerHalf = dataArrayRef.current.slice(0, (dataArrayRef.current.length / 2) - 1);
                const upperHalf = dataArrayRef.current.slice((dataArrayRef.current.length / 2) - 1, dataArrayRef.current.length - 1);
                bassFr = lowerHalf.length > 0 ? (lowerHalf.reduce((a, b) => a + b, 0) / lowerHalf.length) / 255 : 0;
                treFr = upperHalf.length > 0 ? (upperHalf.reduce((a, b) => a + b, 0) / upperHalf.length) / 255 : 0;
            }

            if(shardsRef.current){
                // Animate material color based on audio
                mixedColor.copy(baseColor1).lerp(baseColor2, treFr);
                // Control brightness with bass intensity. Ensure it doesn't go completely black.
                const brightness = 0.2 + bassFr * 2.0;
                (shardsRef.current.material as THREE.MeshBasicMaterial).color.copy(mixedColor).multiplyScalar(brightness);
                (shardsRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + treFr * 0.5;


                for(let i = 0; i < count; i++){
                    shardsRef.current.getMatrixAt(i, dummy.matrix);
                    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                    
                    // Add positional movement
                    const movementAmount = 0.05 + bassFr * 0.2;
                    dummy.position.x += Math.sin(time * 0.0005 + i * 0.5) * movementAmount;
                    dummy.position.y += Math.cos(time * 0.0005 + i * 0.5) * movementAmount;

                    // Add rotation
                    dummy.rotation.y += 0.02 * ((i % 5) + 1);
                    dummy.rotation.x += 0.01 * ((i % 3) + 1);

                    // Wrap around logic
                    const boundary = 100;
                    if (dummy.position.x > boundary) dummy.position.x = -boundary;
                    if (dummy.position.x < -boundary) dummy.position.x = boundary;
                    if (dummy.position.y > boundary) dummy.position.y = -boundary;
                    if (dummy.position.y < -boundary) dummy.position.y = boundary;

                    dummy.updateMatrix();
                    shardsRef.current.setMatrixAt(i, dummy.matrix);
                }
                shardsRef.current.instanceMatrix.needsUpdate = true;
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
            geometry.dispose();
            (shards.material as THREE.Material).dispose();
            renderer.dispose();
        };
    }, [scene, camera, dummy, analyser, baseColor1, baseColor2, mixedColor]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default ShardFieldBackground;
