
"use client"

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise3D } from 'simplex-noise';


interface VisualizerProps {
  analyser: AnalyserNode | null;
  amp: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, amp }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const geometryRef = useRef<THREE.IcosahedronGeometry | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number>();

  const noise3D = useMemo(() => createNoise3D(), []);

  const analyserPropRef = useRef(analyser);
  analyserPropRef.current = analyser;

  const ampPropRef = useRef(amp);
  ampPropRef.current = amp;


  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 35;
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.02;
    controls.zoomSpeed = 2.5;
    controls.screenSpacePanning = false;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    controls.enablePan = false;
    controlsRef.current = controls;

    // --- Sphere Mesh ---
    const geometry = new THREE.IcosahedronGeometry(6.328, 4);
    geometryRef.current = geometry;
    (geometry as any).userData.originalPositions = geometry.attributes.position.clone(); // Store original positions
    
    const material1 = new THREE.MeshBasicMaterial({
      color: 0xFF00FF, // Magenta
      wireframe: true,
    });
    const material2 = new THREE.MeshBasicMaterial({
        color: 0x00FFFF, // Cyan
        wireframe: true,
    });

    const mesh1 = new THREE.Mesh(geometry, material1);
    const mesh2 = new THREE.Mesh(geometry, material2);
    mesh2.rotation.y = 0.05; // Slightly rotate the second mesh to create the two-tone effect

    const group = new THREE.Group();
    group.add(mesh1);
    group.add(mesh2);
    meshGroupRef.current = group;
    scene.add(group);

    // --- Animation Loop ---
    const dataArray = new Uint8Array(analyserPropRef.current?.frequencyBinCount || 128);

    const makeRoughBall = (geometry: THREE.IcosahedronGeometry, bassFr: number, treFr: number) => {
        const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
        const originalPositions = (geometry as any).userData.originalPositions as THREE.BufferAttribute;
        const vertex = new THREE.Vector3();
        const time = performance.now();
        
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(originalPositions, i);
            const offset = geometry.parameters.radius;
            
            vertex.normalize();
            const distance = (offset + bassFr * 5) + noise3D(
                vertex.x + time * 0.00007,
                vertex.y + time * 0.00008,
                vertex.z + time * 0.00009
            ) * ampPropRef.current * treFr;
            vertex.multiplyScalar(distance);

            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
    };

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const currentAnalyser = analyserPropRef.current;
      const currentGeometry = geometryRef.current;
      const currentGroup = meshGroupRef.current;


      if (currentAnalyser && currentGeometry) {
        currentAnalyser.getByteFrequencyData(dataArray);

        const lowerHalf = dataArray.slice(0, (dataArray.length / 2) - 1);
        const upperHalf = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

        const lowerMax = lowerHalf.length > 0 ? Math.max(...lowerHalf) : 0;
        const upperAvg = upperHalf.length > 0 ? upperHalf.reduce((a, b) => a + b, 0) / upperHalf.length : 0;

        const bassFr = lowerMax / 255;
        const treFr = upperAvg / 255;

        makeRoughBall(currentGeometry, bassFr, treFr * 2);
      }
      
      if(currentGroup) {
        currentGroup.rotation.y += 0.001;
        currentGroup.rotation.x += 0.0005;
      }
      
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };

    animate();
    
    // --- Resize Handler ---
    const handleResize = () => {
      const mount = mountRef.current;
      const cam = cameraRef.current;
      const rend = rendererRef.current;

      if (mount && cam && rend) {
        cam.aspect = mount.clientWidth / mount.clientHeight;
        cam.updateProjectionMatrix();
        rend.setSize(mount.clientWidth, mount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (currentMount && rendererRef.current?.domElement) {
          try {
              currentMount.removeChild(rendererRef.current.domElement);
          } catch (e) {
              // ignore, it might be already gone
          }
      }
      
      if (meshGroupRef.current) {
        meshGroupRef.current.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });
      }
      rendererRef.current?.dispose();
    };
  }, [noise3D]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default Visualizer;
