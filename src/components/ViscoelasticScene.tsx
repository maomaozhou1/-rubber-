import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Line } from '@react-three/drei';
import * as THREE from 'three';

// --- Components for the 3D Scene ---

const PolymerChain = ({ position, stretch = 1, color = "#4ade80", hasCrosslinks = false }: { position: [number, number, number], stretch?: number, color?: string, hasCrosslinks?: boolean }) => {
  const points = useMemo(() => {
    const p = [];
    const segments = 24;
    const baseLength = 2;
    // Seeded random for consistent chain shape
    const seed = position[0] * 100 + position[2];
    const random = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const noise = (1 - stretch * 0.4) * 0.5;
      p.push(new THREE.Vector3(
        (random(seed + i) - 0.5) * noise,
        (t - 0.5) * baseLength * (1 + stretch * 0.8),
        (random(seed + i + 100) - 0.5) * noise
      ));
    }
    return p;
  }, [stretch, position]);

  return (
    <group position={position}>
      <Line points={points} color={color} lineWidth={2} />
      {hasCrosslinks && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
};

const Spring = ({ position, length = 1, color = "#fbbf24" }: { position: [number, number, number], length?: number, color?: string }) => {
  const points = useMemo(() => {
    const p = [];
    const turns = 8;
    const segments = 100;
    const radius = 0.2;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns;
      p.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        (t - 0.5) * length,
        Math.sin(angle) * radius
      ));
    }
    return p;
  }, [length]);

  return (
    <group position={position}>
      <Line points={points} color={color} lineWidth={3} />
      <mesh position={[0, length / 2, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, -length / 2, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
};

const Dashpot = ({ position, length = 2.5, baseLength = 2.5, color = "#60a5fa" }: { position: [number, number, number], length?: number, baseLength?: number, color?: string }) => {
  // In a compression/extension damper (like a gas strut or syringe):
  // The cylinder is attached to the bottom plate.
  // The rod is attached to the top plate and extends down into the cylinder.
  // The piston head is at the bottom of the rod.
  const cylinderLength = baseLength;
  const rodLength = baseLength;
  
  // Calculate how much the rod is pulled out of the cylinder
  const extension = length - baseLength;
  
  return (
    <group position={position}>
      {/* Outer Cylinder (Container) attached to bottom plate */}
      <mesh position={[0, -length / 2 + cylinderLength / 2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, cylinderLength, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
      {/* Cylinder Top Collar/Seal */}
      <mesh position={[0, -length / 2 + cylinderLength, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.1, 32]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Inner Piston Head attached to bottom of rod */}
      <mesh position={[0, length / 2 - rodLength, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 32]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {/* Piston Rod attached to top plate, extending downwards */}
      <mesh position={[0, length / 2 - rodLength / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, rodLength, 32]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Top Plate */}
      <mesh position={[0, length / 2, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* Bottom Plate */}
      <mesh position={[0, -length / 2, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
};

export const ViscoelasticScene = ({ 
  mode, 
  mechanicalModel,
  strain, 
  viscousStrain,
  viscousStrain2 = 0,
  elasticStrain
}: { 
  mode: 'molecular' | 'mechanical', 
  mechanicalModel: 'maxwell' | 'kelvin' | 'sls_maxwell' | 'sls_kelvin' | 'generalized_maxwell',
  strain: number, 
  viscousStrain: number,
  viscousStrain2?: number,
  elasticStrain: number
}) => {
  // Clamp visual strain to prevent piston from pulling out of cylinder
  const MAX_STRAIN = 2.2;
  
  // Safety check for inputs
  const safe = (val: number, fallback = 0) => (Number.isFinite(val) && !isNaN(val)) ? val : fallback;
  
  let vStrain = safe(strain);
  let vViscous = safe(viscousStrain);
  let vViscous2 = safe(viscousStrain2);
  let vElastic = safe(elasticStrain);
  
  if (mechanicalModel === 'maxwell') {
    if (vViscous > MAX_STRAIN) vViscous = MAX_STRAIN;
    if (vElastic > MAX_STRAIN) vElastic = MAX_STRAIN;
  } else if (mechanicalModel === 'kelvin') {
    if (vStrain > MAX_STRAIN) vStrain = MAX_STRAIN;
  } else if (mechanicalModel === 'sls_maxwell' || mechanicalModel === 'sls_kelvin') {
    if (vStrain > MAX_STRAIN && vStrain !== 0) {
      const ratio = MAX_STRAIN / vStrain;
      vStrain = MAX_STRAIN;
      vViscous *= ratio;
      vElastic *= ratio;
    }
  } else if (mechanicalModel === 'generalized_maxwell') {
    if (vStrain > MAX_STRAIN && vStrain !== 0) {
      const ratio = MAX_STRAIN / vStrain;
      vStrain = MAX_STRAIN;
      vViscous *= ratio;
      vViscous2 *= ratio;
      vElastic *= ratio;
    }
  }
  const isClamped = (safe(strain) > MAX_STRAIN) || (safe(viscousStrain) > MAX_STRAIN) || (safe(elasticStrain) > MAX_STRAIN) || (safe(viscousStrain2) > MAX_STRAIN);

  return (
    <Canvas shadows className="w-full h-full bg-neutral-900">
      <PerspectiveCamera makeDefault position={[7, 3, 7]} />
      <OrbitControls enablePan={false} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <gridHelper args={[20, 20, 0x666666, 0x444444]} position={[0, -2, 0]} />

      {mode === 'molecular' ? (
        <group>
          {Array.from({ length: 9 }).map((_, i) => (
            <PolymerChain 
              key={i} 
              position={[(i % 3 - 1) * 1.5, 0, (Math.floor(i / 3) - 1) * 1.5]} 
              stretch={strain} 
              hasCrosslinks={true}
            />
          ))}
          <Text position={[0, 3, 0]} fontSize={0.3} color="white">
            硫化橡胶：交联分子链熵弹性
          </Text>
          <Text position={[0, -2.5, 0]} fontSize={0.15} color="#888">
            红色球体代表交联点 (Cross-links)，限制了分子链的永久位移
          </Text>
        </group>
      ) : (
        <group>
          {/* Fixed Ground Base */}
          <group position={[0, -2.05, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[4, 0.1, 1.5]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[4.5, 0.3, 2]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <Text position={[0, -0.2, 1.01]} fontSize={0.15} color="#94a3b8">
              固定基座 (Fixed Base)
            </Text>
          </group>

          {mechanicalModel === 'maxwell' && (
            <group position={[0, vViscous + 0.5, 0]}>
              <Spring position={[0, (1.5 + vElastic) / 2, 0]} length={1.5 + vElastic} />
              <Dashpot position={[0, -(2.5 + vViscous) / 2, 0]} length={2.5 + vViscous} baseLength={2.5} />
              <Text position={[0, 3.5 + vElastic/2, 0]} fontSize={0.3} color="white">Maxwell 模型 (串联)</Text>
            </group>
          )}

          {mechanicalModel === 'kelvin' && (
            <group position={[0, vStrain / 2 - 0.75, 0]}>
              <Spring position={[-0.5, 0, 0]} length={2.5 + vStrain} />
              <Dashpot position={[0.5, 0, 0]} length={2.5 + vStrain} baseLength={2.5} />
              <mesh position={[0, (2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[1.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <mesh position={[0, -(2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[1.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <Text position={[0, 3.5 + vStrain/2, 0]} fontSize={0.3} color="white">Kelvin-Voigt 模型 (并联)</Text>
            </group>
          )}

          {mechanicalModel === 'sls_maxwell' && (
            <group position={[0, vStrain / 2 - 0.75, 0]}>
              {/* Main Spring */}
              <Spring position={[-1, 0, 0]} length={2.5 + vStrain} />
              
              {/* Maxwell Arm (Spring + Dashpot) */}
              <group position={[1, 0, 0]}>
                <Spring position={[0, (1.5 + vViscous) / 2, 0]} length={1.0 + (vStrain - vViscous)} />
                <Dashpot position={[0, -(1.0 + (vStrain - vViscous)) / 2, 0]} length={1.5 + vViscous} baseLength={1.5} />
              </group>

              {/* Connecting Bars */}
              <mesh position={[0, (2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[2.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <mesh position={[0, -(2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[2.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>

              <Text position={[0, 3.5 + vStrain/2, 0]} fontSize={0.3} color="white">SLS 模型 (Maxwell 形式)</Text>
            </group>
          )}

          {mechanicalModel === 'sls_kelvin' && (
            <group position={[0, vStrain / 2 - 0.75, 0]}>
              {/* Top Spring E1 */}
              <Spring position={[0, (1.5 + vViscous) / 2, 0]} length={1.0 + vElastic} />
              
              {/* Bottom Kelvin Unit */}
              <group position={[0, -(1.0 + vElastic) / 2, 0]}>
                <Spring position={[-0.5, 0, 0]} length={1.5 + vViscous} />
                <Dashpot position={[0.5, 0, 0]} length={1.5 + vViscous} baseLength={1.5} />
                <mesh position={[0, (1.5 + vViscous) / 2, 0]}>
                  <boxGeometry args={[1.6, 0.05, 0.6]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[0, -(1.5 + vViscous) / 2, 0]}>
                  <boxGeometry args={[1.6, 0.05, 0.6]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>
              </group>

              <Text position={[0, 3.5 + vStrain/2, 0]} fontSize={0.3} color="white">SLS 模型 (Kelvin 形式)</Text>
            </group>
          )}

          {mechanicalModel === 'generalized_maxwell' && (
            <group position={[0, vStrain / 2 - 0.75, 0]}>
              {/* Main Spring E0 */}
              <Spring position={[-1.5, 0, 0]} length={2.5 + vStrain} />
              
              {/* Maxwell Arm 1 (E1, η1) */}
              <group position={[0, 0, 0]}>
                <Spring position={[0, (1.5 + vViscous) / 2, 0]} length={1.0 + (vStrain - vViscous)} />
                <Dashpot position={[0, -(1.0 + (vStrain - vViscous)) / 2, 0]} length={1.5 + vViscous} baseLength={1.5} />
              </group>

              {/* Maxwell Arm 2 (E2, η2) */}
              <group position={[1.5, 0, 0]}>
                <Spring position={[0, (1.5 + vViscous2) / 2, 0]} length={1.0 + (vStrain - vViscous2)} />
                <Dashpot position={[0, -(1.0 + (vStrain - vViscous2)) / 2, 0]} length={1.5 + vViscous2} baseLength={1.5} />
              </group>

              {/* Connecting Bars */}
              <mesh position={[0, (2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[3.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <mesh position={[0, -(2.5 + vStrain) / 2, 0]}>
                <boxGeometry args={[3.6, 0.05, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>

              <Text position={[0, 3.5 + vStrain/2, 0]} fontSize={0.3} color="white">广义 Maxwell 模型 (Prony 级数)</Text>
            </group>
          )}

          {isClamped && (
            <Text position={[0, -2.8, 0]} fontSize={0.15} color="#ef4444">
              * 已达到可视化最大行程，图表将继续记录真实数据
            </Text>
          )}
        </group>
      )}
    </Canvas>
  );
};
