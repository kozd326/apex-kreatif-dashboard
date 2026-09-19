'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  roastLevel: 'light' | 'medium' | 'dark';
  originColor: string;
  cameraView: 'perspective' | 'top' | 'macro';
  isSteamActive: boolean;
}

export function ScaldCoffeeCanvas({
  roastLevel,
  originColor,
  cameraView,
  isSteamActive,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  const paramsRef = useRef({
    roastLevel,
    originColor,
    cameraView,
    isSteamActive,
  });

  useEffect(() => {
    paramsRef.current = { roastLevel, originColor, cameraView, isSteamActive };
  }, [roastLevel, originColor, cameraView, isSteamActive]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    // SCENE & WARM EDITORIAL ATMOSPHERE
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xfbf9f5, 0.05);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 6.2);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // LIGHTING (Warm Morning Golden-Hour Sunlight)
    const ambientLight = new THREE.AmbientLight(0xfffbf5, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    sunLight.position.set(6, 10, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const softFillLight = new THREE.DirectionalLight(0xf5ebe0, 0.8);
    softFillLight.position.set(-5, 4, -3);
    scene.add(softFillLight);

    const originAccentLight = new THREE.PointLight(new THREE.Color(originColor), 2.0, 10);
    originAccentLight.position.set(0, 3, 2);
    scene.add(originAccentLight);

    // ROOT CUP & TABLE GROUP
    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // STONE / CERAMIC SAUCER
    const saucerMat = new THREE.MeshStandardMaterial({
      color: 0xede8e1,
      roughness: 0.45,
      metalness: 0.05,
    });

    const saucerGeo = new THREE.CylinderGeometry(2.3, 1.7, 0.22, 64);
    const saucer = new THREE.Mesh(saucerGeo, saucerMat);
    saucer.position.y = -1.22;
    saucer.receiveShadow = true;
    sceneGroup.add(saucer);

    const saucerRimGeo = new THREE.TorusGeometry(2.28, 0.08, 16, 64);
    saucerRimGeo.rotateX(Math.PI / 2);
    const saucerRim = new THREE.Mesh(saucerRimGeo, saucerMat);
    saucerRim.position.y = -1.1;
    sceneGroup.add(saucerRim);

    // CERAMIC COFFEE CUP GROUP
    const cupGroup = new THREE.Group();
    sceneGroup.add(cupGroup);

    // Stoneware Ceramic Material (Tactile Warm Oat / Sand tone)
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2eb,
      roughness: 0.38,
      metalness: 0.08,
    });

    // Inner Glaze (Smooth Off-White)
    const glazeMat = new THREE.MeshStandardMaterial({
      color: 0xfaf9f6,
      roughness: 0.12,
      metalness: 0.04,
    });

    // Cup Outer
    const cupOuterGeo = new THREE.CylinderGeometry(1.42, 1.08, 2.3, 64, 1, true);
    const cupOuter = new THREE.Mesh(cupOuterGeo, ceramicMat);
    cupOuter.castShadow = true;
    cupOuter.receiveShadow = true;
    cupGroup.add(cupOuter);

    // Cup Inner
    const cupInnerGeo = new THREE.CylinderGeometry(1.35, 1.02, 2.25, 64, 1, true);
    const cupInner = new THREE.Mesh(cupInnerGeo, glazeMat);
    cupGroup.add(cupInner);

    // Cup Base
    const cupBaseGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.15, 64);
    const cupBase = new THREE.Mesh(cupBaseGeo, ceramicMat);
    cupBase.position.y = -1.1;
    cupBase.castShadow = true;
    cupGroup.add(cupBase);

    // Cup Smooth Rounded Lip
    const rimGeo = new THREE.TorusGeometry(1.385, 0.05, 16, 64);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, ceramicMat);
    rimMesh.position.y = 1.15;
    cupGroup.add(rimMesh);

    // Cup Handle (Minimalist architectural curve)
    const handleGeo = new THREE.TorusGeometry(0.72, 0.13, 16, 48, Math.PI * 1.12);
    const handle = new THREE.Mesh(handleGeo, ceramicMat);
    handle.position.set(1.54, 0.05, 0);
    handle.rotation.z = -Math.PI / 1.18;
    handle.castShadow = true;
    cupGroup.add(handle);

    // PROCEDURAL LATTE ART CANVAS TEXTURE
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const updateCremaTexture = (roast: string) => {
      if (!ctx) return;
      const baseGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
      if (roast === 'light') {
        baseGrad.addColorStop(0, '#c28138');
        baseGrad.addColorStop(0.45, '#a66524');
        baseGrad.addColorStop(1, '#784415');
      } else if (roast === 'dark') {
        baseGrad.addColorStop(0, '#663212');
        baseGrad.addColorStop(0.5, '#3b1c0a');
        baseGrad.addColorStop(1, '#1f130b');
      } else {
        baseGrad.addColorStop(0, '#b87333');
        baseGrad.addColorStop(0.45, '#8c4b18');
        baseGrad.addColorStop(1, '#42210b');
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Rosetta / Tulip Leaf Layers
      ctx.strokeStyle = 'rgba(255, 250, 240, 0.9)';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';

      // Outer heart loop
      ctx.beginPath();
      ctx.ellipse(256, 260, 95, 145, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner tulip heart petals
      ctx.beginPath();
      ctx.moveTo(256, 130);
      ctx.bezierCurveTo(285, 230, 285, 330, 256, 390);
      ctx.bezierCurveTo(227, 330, 227, 230, 256, 130);
      ctx.fillStyle = 'rgba(255, 252, 245, 0.95)';
      ctx.fill();

      // Fine microfoam bubbles
      for (let i = 0; i < 50; i++) {
        const x = 180 + Math.random() * 152;
        const y = 160 + Math.random() * 192;
        const r = 2 + Math.random() * 4;
        ctx.fillStyle = 'rgba(255, 248, 230, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    updateCremaTexture(roastLevel);
    const cremaTexture = new THREE.CanvasTexture(canvas);

    const liquidGeo = new THREE.CircleGeometry(1.3, 64);
    liquidGeo.rotateX(-Math.PI / 2);
    const liquidMat = new THREE.MeshStandardMaterial({
      map: cremaTexture,
      roughness: 0.25,
      metalness: 0.05,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.92;
    cupGroup.add(liquid);

    // STEAM PARTICLES (Warm, Soft, Translucent Rising Steam)
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: { x: number; y: number; z: number; seed: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 0.7;
      particlePositions[i * 3 + 1] = 1.0 + Math.random() * 2.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.005,
        y: 0.01 + Math.random() * 0.015,
        z: (Math.random() - 0.5) * 0.005,
        seed: Math.random() * 100,
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const steamMat = new THREE.PointsMaterial({
      color: 0xfef3c7,
      size: 0.28,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    const steamParticles = new THREE.Points(particleGeo, steamMat);
    cupGroup.add(steamParticles);

    // MOUSE PARALLAX & DRAG ROTATION
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragRotationY = 0;
    let dragRotationX = 0;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 0.6;
      targetMouseY = y * 0.4;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        dragRotationY += deltaX * 0.008;
        dragRotationX += deltaY * 0.005;
        dragRotationX = Math.max(-0.4, Math.min(0.6, dragRotationX));
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    // RESIZE
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let animationId: number;
    const clock = new THREE.Clock();
    const targetPos = new THREE.Vector3(0, 2.8, 6.2);
    const targetLook = new THREE.Vector3(0, 0.2, 0);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      const { cameraView: currentView, roastLevel: currentRoast, originColor: currentColor, isSteamActive: currentSteam } = paramsRef.current;

      if (currentView === 'top') {
        targetPos.set(0, 6.4, 0.1);
        targetLook.set(0, 0.4, 0);
      } else if (currentView === 'macro') {
        targetPos.set(0, 1.5, 3.4);
        targetLook.set(0, 0.85, 0);
      } else {
        // Perspective (Bar View)
        targetPos.set(0, 2.5, 5.8);
        targetLook.set(0, 0.2, 0);
      }

      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      camera.position.x += (targetPos.x + currentMouseX * 1.1 - camera.position.x) * 0.05;
      camera.position.y += (targetPos.y + currentMouseY * 0.7 - camera.position.y) * 0.05;
      camera.position.z += (targetPos.z - camera.position.z) * 0.05;
      camera.lookAt(targetLook);

      // Idle rotation + user drag
      sceneGroup.rotation.y = dragRotationY + Math.sin(elapsedTime * 0.25) * 0.12 + currentMouseX * 0.2;
      sceneGroup.rotation.x = dragRotationX;
      sceneGroup.position.y = Math.sin(elapsedTime * 0.7) * 0.04;

      originAccentLight.color.set(currentColor);

      // Steam animation
      if (currentSteam) {
        steamParticles.visible = true;
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const vel = particleVelocities[i];
          positions[i * 3] += Math.sin(elapsedTime * 1.4 + vel.seed) * 0.004 + vel.x;
          positions[i * 3 + 1] += vel.y;
          positions[i * 3 + 2] += Math.cos(elapsedTime * 1.4 + vel.seed) * 0.004 + vel.z;

          if (positions[i * 3 + 1] > 3.8) {
            positions[i * 3] = (Math.random() - 0.5) * 0.6;
            positions[i * 3 + 1] = 1.0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
          }
        }
        posAttr.needsUpdate = true;
      } else {
        steamParticles.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full min-h-[480px] md:min-h-[580px] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    />
  );
}
