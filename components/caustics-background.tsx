"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface CausticsBackgroundProps {
  analyser: AnalyserNode | null;
}

const CausticsBackground: React.FC<CausticsBackgroundProps> = ({ analyser }) => {
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

        // --- Custom Shader for Caustics ---
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
            uniform vec3 u_color1;
            uniform vec3 u_color2;
            
            // Simplex noise function
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                           i.z + vec4(0.0, i1.z, i2.z, 1.0))
                         + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                         + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3  ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m*m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }

            void main() {
                vec2 p = vUv * 5.0;
                float speed = u_time * 0.3;
                float noise_pattern = 0.0;
                
                // Multiple layers of noise for complexity
                noise_pattern += 0.5 * snoise(vec3(p, speed));
                noise_pattern += 0.25 * snoise(vec3(p * 2.0, speed * 1.5));
                noise_pattern += 0.125 * snoise(vec3(p * 4.0, speed * 2.0));

                float caustic_pattern = 1.0 / (1.0 + exp(-10.0 * (abs(noise_pattern) - 0.2)));
                
                vec3 color = mix(u_color1, u_color2, u_intensity);
                gl_FragColor = vec4(color * caustic_pattern, caustic_pattern * 0.7);
            }
        `;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_intensity: { value: 0.0 },
                u_color1: { value: new THREE.Color(0x00FFFF) }, // Cyan
                u_color2: { value: new THREE.Color(0xFF00FF) }, // Magenta
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        materialRef.current = material;

        const geometry = new THREE.PlaneGeometry(2, 2);
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);
        
        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            let intensity = 0.0;
            if (analyser && dataArrayRef.current) {
                analyser.getByteFrequencyData(dataArrayRef.current);
                intensity = (dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length) / 255;
            }
            
            if (materialRef.current) {
                materialRef.current.uniforms.u_time.value = clock.getElapsedTime();
                materialRef.current.uniforms.u_intensity.value = intensity * 2.0;
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const currentMount = mountRef.current;
            if (!currentMount) return;
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
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
            className="absolute inset-0 -z-10"
            aria-hidden="true"
        />
    );
};

export default CausticsBackground;
