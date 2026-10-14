'use client';

import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';

// Fixed chest slot on the Shirt3D torso — positioned just in front of the
// front-photo panel (see Shirt3D.tsx) so it draws on top without z-fighting.
// No drag/resize yet; only add/replace for now.
const CHEST_POSITION: [number, number, number] = [0, 0.12, 0.78];
const CHEST_SIZE = 0.4;

function LogoImage({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);
  return (
    <mesh position={CHEST_POSITION}>
      <planeGeometry args={[CHEST_SIZE, CHEST_SIZE]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function ChestPlaceholder() {
  return (
    <mesh position={CHEST_POSITION}>
      <planeGeometry args={[CHEST_SIZE, CHEST_SIZE]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
    </mesh>
  );
}

interface Props {
  imageUrl: string | null;
}

export default function ChestLogo({ imageUrl }: Props) {
  if (!imageUrl) return <ChestPlaceholder />;
  return (
    <Suspense fallback={<ChestPlaceholder />}>
      <LogoImage imageUrl={imageUrl} />
    </Suspense>
  );
}
