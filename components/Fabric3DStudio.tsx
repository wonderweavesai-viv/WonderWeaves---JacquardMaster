
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { YarnDefinition } from '../types';

interface Fabric3DStudioProps {
    weavePattern: string[][];
    structure: boolean[][];
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    warpYarnSequence: string[];
    weftYarnSequence: string[];
    textureUrl: string; // The 2D generated image for drape mode
    epi: number;
    ppi: number;
}

export const Fabric3DStudio: React.FC<Fabric3DStudioProps> = ({
    weavePattern, structure, warpYarns, weftYarns, warpYarnSequence, weftYarnSequence, textureUrl, epi, ppi
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<'drape' | 'structure'>('drape');
    const [drapeObject, setDrapeObject] = useState<'curtain' | 'sofa'>('curtain');
    
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameIdRef = useRef<number>(0);

    // --- INITIAL SETUP ---
    useEffect(() => {
        if (!containerRef.current) return;

        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827); // Dark gray bg
        scene.fog = new THREE.Fog(0x111827, 20, 100);

        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        camera.position.set(0, 10, 20);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);
        
        const spotLight = new THREE.SpotLight(0xffffff, 0.8);
        spotLight.position.set(-10, 10, 5);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 1;
        scene.add(spotLight);
        
        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        scene.add(floor);

        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        controlsRef.current = controls;

        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameIdRef.current);
            renderer.dispose();
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    // --- SCENE CONTENT UPDATE ---
    useEffect(() => {
        if (!sceneRef.current || !rendererRef.current) return;
        const scene = sceneRef.current;

        // Clear existing meshes (but keep lights and floor)
        // We identify our dynamic objects by a custom property or just remove all meshes that are not the floor
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            if ((obj.type === 'Mesh' || obj.type === 'Group') && obj.position.y !== -0.1) { // Hack to keep floor
                scene.remove(obj);
            }
        }

        if (mode === 'drape') {
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(textureUrl);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;

            if (drapeObject === 'curtain') {
                // --- CURTAIN MODE ---
                texture.repeat.set(4, 4); 

                const width = 15;
                const height = 15;
                const segmentsW = 60;
                const segmentsH = 60;
                const geometry = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH);
                
                const positionAttribute = geometry.attributes.position;
                const vertex = new THREE.Vector3();

                for (let i = 0; i < positionAttribute.count; i++) {
                    vertex.fromBufferAttribute(positionAttribute, i);
                    const freq = 3.0;
                    const amplitude = 1.5;
                    const fold = Math.sin(vertex.x * freq);
                    const microFold = Math.sin(vertex.x * freq * 5) * 0.1;
                    vertex.z = (fold + microFold) * amplitude;
                    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
                }
                geometry.computeVertexNormals();

                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    roughness: 0.6,
                    metalness: 0.1,
                    bumpMap: texture,
                    bumpScale: 0.05
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = 5; // Lift up
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);

            } else {
                // --- SOFA MODE ---
                texture.repeat.set(3, 3); // Tighter repeat for furniture

                const fabricMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.8,
                    metalness: 0.0,
                    bumpMap: texture,
                    bumpScale: 0.02
                });

                const sofaGroup = new THREE.Group();

                // Dimensions
                const width = 14;
                const depth = 7;
                const seatHeight = 2.5;
                const legHeight = 1.0;
                const backHeight = 5.0;
                const armWidth = 1.8;
                const armHeight = 4.0;

                // Base (Frame)
                const baseGeo = new THREE.BoxGeometry(width, seatHeight, depth);
                const base = new THREE.Mesh(baseGeo, fabricMat);
                base.position.y = legHeight + seatHeight / 2;
                base.castShadow = true;
                base.receiveShadow = true;
                sofaGroup.add(base);

                // Backrest
                const backGeo = new THREE.BoxGeometry(width, backHeight, 2.0);
                const back = new THREE.Mesh(backGeo, fabricMat);
                back.position.y = legHeight + seatHeight + backHeight / 2;
                back.position.z = -depth / 2 + 1.0;
                back.castShadow = true;
                back.receiveShadow = true;
                sofaGroup.add(back);

                // Armrests
                const armGeo = new THREE.BoxGeometry(armWidth, armHeight, depth);
                const armL = new THREE.Mesh(armGeo, fabricMat);
                armL.position.set(-width / 2 + armWidth / 2, legHeight + seatHeight / 2 + armHeight / 4 + 0.5, 0);
                armL.castShadow = true;
                armL.receiveShadow = true;
                sofaGroup.add(armL);

                const armR = new THREE.Mesh(armGeo, fabricMat);
                armR.position.set(width / 2 - armWidth / 2, legHeight + seatHeight / 2 + armHeight / 4 + 0.5, 0);
                armR.castShadow = true;
                armR.receiveShadow = true;
                sofaGroup.add(armR);

                // Seat Cushions (2)
                const cushionW = (width - (armWidth * 2)) / 2 - 0.1;
                const cushionGeo = new THREE.BoxGeometry(cushionW, 1.2, depth - 1.0);
                const seat1 = new THREE.Mesh(cushionGeo, fabricMat);
                seat1.position.set(-cushionW / 2 - 0.05, legHeight + seatHeight + 0.6, 0.5);
                seat1.castShadow = true;
                seat1.receiveShadow = true;
                sofaGroup.add(seat1);

                const seat2 = new THREE.Mesh(cushionGeo, fabricMat);
                seat2.position.set(cushionW / 2 + 0.05, legHeight + seatHeight + 0.6, 0.5);
                seat2.castShadow = true;
                seat2.receiveShadow = true;
                sofaGroup.add(seat2);

                // Back Cushions (2)
                const backCushionGeo = new THREE.BoxGeometry(cushionW, 3.5, 1.2);
                const back1 = new THREE.Mesh(backCushionGeo, fabricMat);
                back1.position.set(-cushionW / 2 - 0.05, legHeight + seatHeight + 1.2 + 1.75, -depth / 2 + 2.0);
                back1.rotation.x = -0.15;
                back1.castShadow = true;
                back1.receiveShadow = true;
                sofaGroup.add(back1);

                const back2 = new THREE.Mesh(backCushionGeo, fabricMat);
                back2.position.set(cushionW / 2 + 0.05, legHeight + seatHeight + 1.2 + 1.75, -depth / 2 + 2.0);
                back2.rotation.x = -0.15;
                back2.castShadow = true;
                back2.receiveShadow = true;
                sofaGroup.add(back2);

                // Feet
                const legGeo = new THREE.CylinderGeometry(0.3, 0.2, legHeight);
                const legMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 });
                const legPositions = [
                    [-width/2 + 1, legHeight/2, depth/2 - 1],
                    [width/2 - 1, legHeight/2, depth/2 - 1],
                    [-width/2 + 1, legHeight/2, -depth/2 + 1],
                    [width/2 - 1, legHeight/2, -depth/2 + 1],
                ];
                legPositions.forEach(pos => {
                    const leg = new THREE.Mesh(legGeo, legMat);
                    leg.position.set(pos[0], pos[1], pos[2]);
                    leg.castShadow = true;
                    sofaGroup.add(leg);
                });

                scene.add(sofaGroup);
            }
            
            // Adjust Camera
            if (cameraRef.current) {
                // If switching objects, maybe reset camera slightly?
                // cameraRef.current.position.set(0, 10, 20);
                controlsRef.current?.target.set(0, 2, 0);
            }

        } else {
            // --- STRUCTURE INTERLACEMENT MODE ---
            const VIEW_W = Math.min(16, weavePattern[0].length);
            const VIEW_H = Math.min(16, weavePattern.length);
            
            const spacing = 1.2;
            const group = new THREE.Group();

            const getColor = (hex: string) => parseInt(hex.replace('#', '0x'), 16);

            for (let i = 0; i < VIEW_W; i++) {
                const char = warpYarnSequence[i % warpYarnSequence.length] || 'A';
                const def = warpYarns[char];
                const color = getColor(def?.color || '#ffffff');
                const thickness = (def?.thickness || 1) * 0.3;
                
                const points = [];
                for (let j = 0; j <= VIEW_H; j++) {
                    const z = j * spacing - (VIEW_H * spacing) / 2;
                    const rowIdx = j % structure.length;
                    const colIdx = i % structure[0].length;
                    const isOver = structure[rowIdx] ? structure[rowIdx][colIdx] : false;
                    const y = isOver ? thickness : -thickness;
                    points.push(new THREE.Vector3(i * spacing - (VIEW_W * spacing)/2, y, z));
                }
                
                const curve = new THREE.CatmullRomCurve3(points);
                const geo = new THREE.TubeGeometry(curve, VIEW_H * 4, thickness, 8, false);
                const mat = new THREE.MeshStandardMaterial({ 
                    color: color, 
                    roughness: def?.roughness || 0.5,
                    metalness: def?.fiberType === 'Lurex' ? 0.8 : 0.1
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            }

            for (let j = 0; j < VIEW_H; j++) {
                const char = weftYarnSequence[j % weftYarnSequence.length] || 'A';
                const def = weftYarns[char];
                const color = getColor(def?.color || '#ffffff');
                const thickness = (def?.thickness || 1) * 0.3;

                const points = [];
                for (let i = 0; i <= VIEW_W; i++) {
                    const x = i * spacing - (VIEW_W * spacing) / 2;
                    const z = j * spacing - (VIEW_H * spacing) / 2;
                    const rowIdx = j % structure.length;
                    const colIdx = i % structure[0].length;
                    const isWarpOver = structure[rowIdx] ? structure[rowIdx][colIdx] : false;
                    const y = isWarpOver ? -thickness : thickness;
                    points.push(new THREE.Vector3(x, y, z));
                }

                const curve = new THREE.CatmullRomCurve3(points);
                const geo = new THREE.TubeGeometry(curve, VIEW_W * 4, thickness, 8, false);
                const mat = new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: def?.roughness || 0.5,
                    metalness: def?.fiberType === 'Lurex' ? 0.8 : 0.1 
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            }

            // Lift structure up so it doesn't clip with floor
            group.position.y = 5;
            scene.add(group);
            
            if (cameraRef.current) {
                cameraRef.current.position.set(15, 15, 15);
                controlsRef.current?.target.set(0, 5, 0);
            }
        }

    }, [mode, drapeObject, weavePattern, structure, warpYarns, weftYarns, textureUrl]);

    return (
        <div className="relative w-full h-full bg-gray-900 group">
            <div ref={containerRef} className="w-full h-full" />
            
            {/* View Toggle */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur border border-gray-700 p-1 rounded-lg flex flex-col gap-2 shadow-2xl items-center">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setMode('drape')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${mode === 'drape' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        Drape Sim
                    </button>
                    <button 
                        onClick={() => setMode('structure')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${mode === 'structure' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        Interlacement
                    </button>
                </div>

                {mode === 'drape' && (
                    <div className="flex bg-gray-900 rounded p-0.5 border border-gray-600 w-full">
                        <button 
                            onClick={() => setDrapeObject('curtain')}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${drapeObject === 'curtain' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Curtain
                        </button>
                        <button 
                            onClick={() => setDrapeObject('sofa')}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all ${drapeObject === 'sofa' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Sofa
                        </button>
                    </div>
                )}
            </div>

            <div className="absolute top-4 left-4 text-white/50 text-[10px] font-mono pointer-events-none">
                {mode === 'drape' ? 'Left Click: Rotate | Right Click: Pan | Scroll: Zoom' : 'Visualizing central 16x16 repeat unit'}
            </div>
        </div>
    );
};
