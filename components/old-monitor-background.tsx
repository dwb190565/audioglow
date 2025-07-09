
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface OldMonitorBackgroundProps {
  analyser: AnalyserNode | null;
}

const OldMonitorBackground: React.FC<OldMonitorBackgroundProps> = ({ analyser }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameIdRef = useRef<number>();

    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10), []);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
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

        camera.position.z = 1;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const vertexShader = `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;
            uniform float u_bass;
            uniform vec2 u_resolution;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            vec2 curve(vec2 uv) {
                uv = (uv - 0.5) * 2.0;
                uv *= 1.1;
                uv.x *= 1.0 + pow((abs(uv.y) / 1.1), 2.0) * 0.15;
                uv.y *= 1.0 + pow((abs(uv.x) / 1.1), 2.0) * 0.1;
                uv = (uv / 2.0) + 0.5;
                uv = uv * 0.92 + 0.04;
                return uv;
            }

            void main() {
                vec2 curved_uv = curve(vUv);
                
                if (curved_uv.x < 0.0 || curved_uv.x > 1.0 || curved_uv.y < 0.0 || curved_uv.y > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                
                float jitter = (random(vec2(u_time * 20.0, 2.0)) - 0.5) * 0.015 * u_bass;
                curved_uv += jitter;
                
                float aberration = u_intensity * 0.01;
                float r = random(vec2(curved_uv.x + aberration, curved_uv.y)) * 0.9;
                float g = random(curved_uv) * 0.5; // Weaken green channel
                float b = random(vec2(curved_uv.x - aberration, curved_uv.y)) * 0.9;

                vec3 color = vec3(r, g, b);

                float scanline_intensity = 0.3 + u_intensity * 0.5;
                float scanline = sin(vUv.y * u_resolution.y * 1.5 - u_time * (10.0 + u_intensity * 30.0)) * 0.5 + 0.5;
                color *= 1.0 - (pow(scanline, 4.0) * scanline_intensity);
                
                color *= 0.8 + random(vec2(u_time * 10.0, 0.0)) * 0.2 + u_intensity * 0.5;

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_intensity: { value: 0.0 },
                u_bass: { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight) },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
        });
        materialRef.current = material;

        const geometry = new THREE.PlaneGeometry(2, 2);
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);
        
        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let intensity = 0.0;
            let bass = 0.0;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                intensity = (dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length) / 255;
                bass = (dataArrayRef.current.slice(0, 5).reduce((a, b) => a + b, 0) / 5) / 255;
            }
            
            if (materialRef.current) {
                materialRef.current.uniforms.u_time.value = clock.getElapsedTime();
                materialRef.current.uniforms.u_intensity.value = intensity;
                materialRef.current.uniforms.u_bass.value = bass;
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const currentMount = mountRef.current;
            if (!currentMount || !rendererRef.current) return;
            rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
            if (materialRef.current) {
                materialRef.current.uniforms.u_resolution.value.set(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
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
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [scene, camera, clock, analyser]);

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 -z-10 bg-black"
            aria-hidden="true"
        />
    );
};

export default OldMonitorBackground;
