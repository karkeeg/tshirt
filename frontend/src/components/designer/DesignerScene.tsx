'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Shirt3D from './Shirt3D';
import ChestLogo from './ChestLogo';

interface Props {
  color: string;
  logoUrl: string | null;
}

export default function DesignerScene({ color, logoUrl }: Props) {
  return (
    <div className="h-[560px] w-full bg-gradient-to-b from-zinc-50 to-zinc-100">
      <Canvas shadows camera={{ position: [0, 0.2, 3], fov: 40 }}>
        {/* Plain local lights rather than drei's <Stage environment="..." /> —
            that preset fetches an HDR environment map from an external CDN,
            which is a fragile dependency (it silently kept the canvas hidden
            behind r3f's "hide until first frame" guard when unreachable). */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.22} />
        </mesh>

        <Suspense fallback={null}>
          <Shirt3D color={color} />
        </Suspense>
        <ChestLogo imageUrl={logoUrl} />

        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={5}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
        />
      </Canvas>
    </div>
  );
}
