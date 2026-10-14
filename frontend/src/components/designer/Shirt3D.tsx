'use client';

import { useTexture } from '@react-three/drei';

interface Props {
  color: string;
}

// The real front-view photo (frontend/public/tshirt.jpg) is a flat mockup —
// it can only be shown convincingly face-on, not wrapped around a curved
// surface. It's projected onto a flat panel in front of the torso; rotating
// away from the front reveals the plain procedural body underneath. See
// docs/features/custom-designer.md for the tradeoff.
const PHOTO_SIZE = 1.9;
const PHOTO_POSITION: [number, number, number] = [0, -0.05, 0.75];

/**
 * A procedural stand-in for a real (photographed/UV-mapped) shirt model,
 * with the real product photo projected onto its front face. Built from
 * primitive geometries rather than a sourced 3D asset — see
 * docs/features/custom-designer.md for why. Swappable for a real model
 * later without touching the surrounding rotate/zoom/logo logic.
 */
export default function Shirt3D({ color }: Props) {
  const photoTexture = useTexture('/tshirt.jpg');

  return (
    <group>
      {/* Torso — gives the shape volume and its side/back appearance */}
      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.72, 1.5, 24, 1, false]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Real product photo, front-facing only. Unlit so it reads as a
          true-color flat photo rather than being tinted by scene lighting. */}
      <mesh position={PHOTO_POSITION}>
        <planeGeometry args={[PHOTO_SIZE, PHOTO_SIZE]} />
        <meshBasicMaterial map={photoTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}
