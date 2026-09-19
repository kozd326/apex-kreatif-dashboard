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

  // References for live parameter updates without re-instantiating WebGL context
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

    // SCENE
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0e0c, 0.08);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 6);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xfef3c7, 0.7);
    scene.add(ambientLight);

    const warmLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    warmLight.position.set(5, 8, 4);
    scene.add(warmLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.8, 15);
    rimLight.position.set(-5, 3, -3);
    scene.add(rimLight);

    const originLight = new THREE.PointLight(new THREE.Color(originColor), 2.5, 12);
    originLight.position.set(0, 3, 2);
    scene.add(originLight);

    // COFFEE MUG GROUP
    const cupGroup = new THREE.Group();
    scene.add(cupGroup);

    // Mug Material (Matte Ceramic Charcoal/Stone)
    const mugMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.35,
      metalness: 0.15,
    });

    // Inner Mug Material (Smooth Off-White Glaze)
    const glazeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4,
      roughness: 0.1,
      metalness: 0.05,
    });

    // Mug Outer Cylinder
    const mugOuterGeo = new THREE.CylinderGeometry(1.35, 1.1, 2.4, 48, 1, true);
    const mugOuter = new THREE.Mesh(mugOuterGeo, mugMaterial);
    cupGroup.add(mugOuter);

    // Mug Inner Cylinder
    const mugInnerGeo = new THREE.CylinderGeometry(1.28, 1.03, 2.35, 48, 1, true);
    const mugInner = new THREE.Mesh(mugInnerGeo, glazeMaterial);
    cupGroup.add(mugInner);

    // Mug Base
    const mugBaseGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.15, 48);
    const mugBase = new THREE.Mesh(mugBaseGeo, mugMaterial);
    mugBase.position.y = -1.15;
    cupGroup.add(mugBase);

    // Mug Rim Lip
    const rimGeo = new THREE.TorusGeometry(1.315, 0.045, 16, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, mugMaterial);
    rimMesh.position.y = 1.2;
    cupGroup.add(rimMesh);

    // Mug Handle
    const handleGeo = new THREE.TorusGeometry(0.75, 0.14, 16, 36, Math.PI * 1.1);
    const handle = new THREE.Mesh(handleGeo, mugMaterial);
    handle.position.set(1.5, 0.1, 0);
    handle.rotation.z = -Math.PI / 1.15;
    cupGroup.add(handle);

    // COFFEE LIQUID SURFACE WITH PROCEDURAL LATTE ART TEXTURE
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const updateCremaTexture = (roast: string) => {
      if (!ctx) return;
      const baseGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
      if (roast === 'light') {
        baseGrad.addColorStop(0, '#eab308');
        baseGrad.addColorStop(0.4, '#ca8a04');
        baseGrad.addColorStop(1, '#854d0e');
      } else if (roast === 'dark') {
        baseGrad.addColorStop(0, '#78350f');
        baseGrad.addColorStop(0.5, '#451a03');
        baseGrad.addColorStop(1, '#1c1917');
      } else {
        baseGrad.addColorStop(0, '#d97706');
        baseGrad.addColorStop(0.5, '#92400e');
        baseGrad.addColorStop(1, '#451a03');
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Latte art rosetta / tulip lines
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(256, 256, 90, 140, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(256, 120);
      ctx.bezierCurveTo(280, 220, 280, 320, 256, 380);
      ctx.bezierCurveTo(232, 320, 232, 220, 256, 120);
      ctx.fillStyle = 'rgba(255, 251, 235, 0.9)';
      ctx.fill();

      // Delicate micro-foam bubbles
      for (let i = 0; i < 60; i++) {
        const x = 180 + Math.random() * 152;
        const y = 160 + Math.random() * 192;
        const r = 2 + Math.random() * 5;
        ctx.fillStyle = 'rgba(254, 249, 195, 0.55)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    updateCremaTexture(roastLevel);
    const cremaTexture = new THREE.CanvasTexture(canvas);

    const liquidGeo = new THREE.CircleGeometry(1.23, 48);
    liquidGeo.rotateX(-Math.PI / 2);
    const liquidMat = new THREE.MeshStandardMaterial({
      map: cremaTexture,
      roughness: 0.2,
      metalness: 0.1,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.95;
    cupGroup.add(liquid);

    // FLOATING 3D COFFEE BEANS
    const beanGeo = new THREE.SphereGeometry(0.24, 16, 16);
    beanGeo.scale(1, 0.65, 1.45); // Coffee bean shape

    const getBeanColor = (roast: string) => {
      if (roast === 'light') return 0xb45309;
      if (roast === 'dark') return 0x29180c;
      return 0x78350f;
    };

    const beanMat = new THREE.MeshStandardMaterial({
      color: getBeanColor(roastLevel),
      roughness: 0.45,
      metalness: 0.25,
    });

    const beanCount = 28;
    const beans: {
      mesh: THREE.Mesh;
      basePos: THREE.Vector3;
      speed: number;
      rotSpeed: THREE.Vector3;
    }[] = [];

    for (let i = 0; i < beanCount; i++) {
      const beanMesh = new THREE.Mesh(beanGeo, beanMat);
      const angle = (i / beanCount) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 2.4 + Math.random() * 2.2;
      const y = -1.2 + Math.random() * 3.4;
      const basePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      beanMesh.position.copy(basePos);
      beanMesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      scene.add(beanMesh);

      beans.push({
        mesh: beanMesh,
        basePos,
        speed: 0.8 + Math.random() * 0.7,
        rotSpeed: new THREE.Vector3(
          0.008 + Math.random() * 0.012,
          0.01 + Math.random() * 0.015,
          0.005 + Math.random() * 0.01
        ),
      });
    }

    // STEAM & AROMA PARTICLES
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOpacities = new Float32Array(particleCount);
    const particleVelocities: { x: number; y: number; z: number; seed: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 0.8;
      particlePositions[i * 3 + 1] = 1.0 + Math.random() * 2.8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      particleOpacities[i] = Math.random();
      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.006,
        y: 0.012 + Math.random() * 0.018,
        z: (Math.random() - 0.5) * 0.006,
        seed: Math.random() * 100,
      });
    }

    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const steamMat = new THREE.PointsMaterial({
      color: 0xfef3c7,
      size: 0.22,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });

    const steamParticles = new THREE.Points(particleGeo, steamMat);
    cupGroup.add(steamParticles);

    // MOUSE PARALLAX
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 0.8;
      targetMouseY = y * 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // RESIZE HANDLER
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
    let clock = new THREE.Clock();

    const targetPos = new THREE.Vector3(0, 2.5, 6);
    const targetLook = new THREE.Vector3(0, 0.4, 0);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera view positions based on active cameraView prop
      const { cameraView: currentView, roastLevel: currentRoast, originColor: currentColor, isSteamActive: currentSteam } = paramsRef.current;

      if (currentView === 'top') {
        targetPos.set(0, 6.2, 0.1);
        targetLook.set(0, 0.5, 0);
      } else if (currentView === 'macro') {
        targetPos.set(0, 1.4, 3.2);
        targetLook.set(0, 0.9, 0);
      } else {
        // Perspective (Bar View)
        targetPos.set(0, 2.3, 5.8);
        targetLook.set(0, 0.3, 0);
      }

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      camera.position.x += (targetPos.x + currentMouseX * 1.2 - camera.position.x) * 0.06;
      camera.position.y += (targetPos.y + currentMouseY * 0.8 - camera.position.y) * 0.06;
      camera.position.z += (targetPos.z - camera.position.z) * 0.06;
      camera.lookAt(targetLook);

      // Gentle cup idle floating rotation
      cupGroup.rotation.y = Math.sin(elapsedTime * 0.35) * 0.18 + currentMouseX * 0.3;
      cupGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.06;

      // Update light color dynamically
      originLight.color.set(currentColor);
      beanMat.color.set(getBeanColor(currentRoast));

      // Animate floating beans
      beans.forEach((b, idx) => {
        b.mesh.rotation.x += b.rotSpeed.x;
        b.mesh.rotation.y += b.rotSpeed.y;
        b.mesh.rotation.z += b.rotSpeed.z;

        const floatOffset = Math.sin(elapsedTime * b.speed + idx) * 0.25;
        b.mesh.position.y = b.basePos.y + floatOffset;
        b.mesh.position.x = b.basePos.x + Math.cos(elapsedTime * 0.2 + idx) * 0.15;
      });

      // Animate steam particles
      if (currentSteam) {
        steamParticles.visible = true;
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const vel = particleVelocities[i];
          positions[i * 3] += Math.sin(elapsedTime * 1.5 + vel.seed) * 0.005 + vel.x;
          positions[i * 3 + 1] += vel.y;
          positions[i * 3 + 2] += Math.cos(elapsedTime * 1.5 + vel.seed) * 0.005 + vel.z;

          // Recycle particles that reach top
          if (positions[i * 3 + 1] > 4.2) {
            positions[i * 3] = (Math.random() - 0.5) * 0.7;
            positions[i * 3 + 1] = 1.0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
          }
        }
        posAttr.needsUpdate = true;
      } else {
        steamParticles.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationId);
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
      className="relative w-full h-full min-h-[500px] md:min-h-[620px] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    />
  );
}
