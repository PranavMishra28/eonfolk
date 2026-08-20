import React, { useLayoutEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "./style.css";

const CITIZENS = Array.from({ length: 12 }, (_, index) => ({
  id: `Citizen ${index + 1}`,
  x: (index % 4) * 1.35 - 2,
  z: Math.floor(index / 4) * 1.35 - 1.35,
  color: ["#bf6c52", "#547c68", "#d0a15a", "#6f739d"][index % 4],
}));

function PerformanceProbe() {
  const samples = useRef([]);
  const renderer = useThree(({ gl }) => gl);
  useFrame((_, delta) => {
    if (samples.current.length >= 360) return;
    if (samples.current.length > 30) samples.current.push(delta * 1000);
    else samples.current.push(0);
    if (samples.current.length === 360) {
      const clean = samples.current.slice(31).sort((a, b) => a - b);
      window.__EONFOLK_METRICS__ = {
        samples: clean.length,
        medianFrameMs: clean[Math.floor(clean.length * 0.5)],
        p95FrameMs: clean[Math.floor(clean.length * 0.95)],
        maxFrameMs: clean.at(-1),
        drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        devicePixelRatio: renderer.getPixelRatio(),
      };
    }
  });
  return null;
}

function Citizens() {
  return CITIZENS.map((citizen, index) => (
    <group key={citizen.id} position={[citizen.x, 0, citizen.z]} rotation={[0, index * 0.3, 0]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.17, 0.42, 4, 8]} />
        <meshStandardMaterial color={citizen.color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.19, 12, 8]} />
        <meshStandardMaterial color="#e2b892" roughness={0.9} />
      </mesh>
    </group>
  ));
}

function Props() {
  const ref = useRef();
  const transforms = useMemo(
    () => Array.from({ length: 80 }, (_, index) => ({
      x: ((index * 37) % 19) - 9,
      z: ((index * 53) % 17) - 8,
      scale: 0.55 + (index % 5) * 0.08,
    })),
    [],
  );
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < transforms.length; index += 1) {
      const { x, z, scale } = transforms[index];
      matrix.compose(
        new THREE.Vector3(x, 0.45 * scale, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      ref.current.setMatrixAt(index, matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [transforms]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow receiveShadow>
      <coneGeometry args={[0.35, 1.1, 7]} />
      <meshStandardMaterial color="#365c45" roughness={1} />
    </instancedMesh>
  );
}

function Settlement() {
  return (
    <>
      <color attach="background" args={["#cfd6c1"]} />
      <fog attach="fog" args={["#cfd6c1", 15, 27]} />
      <ambientLight intensity={1.5} />
      <directionalLight castShadow position={[7, 10, 4]} intensity={2.5} shadow-mapSize={[1024, 1024]} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color="#869267" roughness={1} />
      </mesh>
      {[-3.5, 0, 3.5].map((x, index) => (
        <group key={x} position={[x, 0, -3.6 + index * 0.25]} rotation={[0, index * 0.3 - 0.25, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[2.2, 1.1, 1.6]} />
            <meshStandardMaterial color={["#b8976b", "#a7805f", "#c3a473"][index]} roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0, 1.4, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.65, 1.2, 4]} />
            <meshStandardMaterial color="#67483b" roughness={1} />
          </mesh>
        </group>
      ))}
      <Props />
      <Citizens />
      <PerformanceProbe />
    </>
  );
}

function App() {
  return (
    <main>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [8.5, 8, 10.5], fov: 38, near: 0.1, far: 60 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Settlement />
      </Canvas>
      <section className="world-title" aria-label="World status">
        <p>DAY 12 · DUSK</p>
        <h1>Riverhold is restless.</h1>
        <span>12 citizens · 3 homes · one unresolved promise</span>
      </section>
      <aside aria-label="Selected citizen">
        <p className="eyebrow">SELECTED CITIZEN</p>
        <h2>Mara Vale</h2>
        <p>Gathering water for the eastern household.</p>
        <button type="button">Open Mara’s story</button>
      </aside>
      <nav aria-label="Citizens">
        {CITIZENS.slice(0, 8).map(({ id }) => <button key={id} type="button">{id}</button>)}
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
