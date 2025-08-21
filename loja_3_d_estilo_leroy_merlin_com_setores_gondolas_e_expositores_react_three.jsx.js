import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html, RoundedBox, Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loja 3D em estilo Leroy Merlin
 * - Setores: Portas/Esquadrias, Louças/Banheiros, Revestimentos/Pisos, Tintas/Acessórios, Ferramentas, Cozinhas Planejadas
 * - Gôndolas e expositores
 * - Ilhas promocionais
 * - Iluminação industrial + spots
 * - Placas suspensas
 *
 * Dicas: Clique e arraste para orbitar, use scroll para zoom. 
 * No painel à direita é possível esconder/mostrar setores e focar a câmera.
 */

/** Utilidades **/
const deg = (d) => (d * Math.PI) / 180;

function SectionFloor({ w, h, color = "#f3f4f6", position = [0, 0.01, 0] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[w, 0.02, h]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function CeilingGrid({ w, h, y = 6 }) {
  // malha metálica/treliça simples
  return (
    <group position={[0, y, 0]}> 
      {[...Array(10)].map((_, i) => (
        <mesh key={`cx-${i}`} position={[((i - 5) * w) / 10, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, h]} />
          <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {[...Array(6)].map((_, i) => (
        <mesh key={`cz-${i}`} rotation={[0, 0, 0]} position={[0, 0, ((i - 3) * h) / 6]}>
          <boxGeometry args={[w, 0.05, 0.05]} />
          <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function PendantLight({ position = [0, 6.2, 0], intensity = 2.2 }) {
  return (
    <group>
      <mesh position={[position[0], position[1] + 0.4, position[2]]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <mesh position={position} castShadow>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.6} color="#e5e7eb" />
      </mesh>
      <pointLight position={[position[0], position[1] - 0.05, position[2]]} intensity={intensity} distance={16} castShadow />
    </group>
  );
}

function Sign({ text, position = [0, 4.2, 0], color = "#ef4444", w = 4, h = 0.8 }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 0, 0.05]} fontSize={0.35} color="white" anchorX="center" anchorY="middle">
        {text}
      </Text>
    </group>
  );
}

function PalletStack({ w = 1.2, h = 1, l = 1, layers = 3, color = "#c4b5a5", boxColor = "#d6d3d1", position = [0, 0.5, 0] }) {
  // palete com caixas (revestimentos/cerâmicas)
  const elems = [];
  const step = 0.3;
  for (let i = 0; i < layers; i++) {
    elems.push(
      <mesh key={i} position={[position[0], position[1] + i * step, position[2]]} castShadow receiveShadow>
        <boxGeometry args={[w, step, l]} />
        <meshStandardMaterial color={i === 0 ? color : boxColor} />
      </mesh>
    );
  }
  return <group>{elems}</group>;
}

function Gondola({ length = 6, height = 2, shelves = 4, position = [0, 1, 0], double = true, color = "#374151" }) {
  // gôndola central dupla
  const shelfGap = (height - 0.2) / shelves;
  return (
    <group position={position}>
      {/* coluna central */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.1, height, length]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[...Array(shelves)].map((_, i) => (
        <mesh key={`sL-${i}`} position={[-0.6, -height / 2 + 0.2 + i * shelfGap, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.04, length]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      {double && [...Array(shelves)].map((_, i) => (
        <mesh key={`sR-${i}`} position={[0.6, -height / 2 + 0.2 + i * shelfGap, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.04, length]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
    </group>
  );
}

function WallRack({ width = 10, rows = 4, position = [0, 1.2, -7], title = "REVESTIMENTOS" }) {
  // painéis inclinados para pisos/azulejos
  const items = [...Array(rows)].map((_, i) => (
    <mesh key={i} rotation={[deg(-65), 0, 0]} position={[-width / 2 + 1.2 + i * (width / rows), 1.0, 0]} castShadow>
      <boxGeometry args={[1.0, 0.02, 1.4]} />
      <meshStandardMaterial color={i % 2 ? "#e5e7eb" : "#d1d5db"} />
    </mesh>
  ));
  return (
    <group position={position}>
      <mesh position={[0, 0.5, -0.3]}>
        <boxGeometry args={[width, 1, 0.6]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {items}
      <Sign text={title} position={[0, 2.4, 0.2]} color="#0ea5e9" w={width * 0.7} />
    </group>
  );
}

function DoorShowcase({ count = 6, position = [8, 1, -2] }) {
  return (
    <group position={position}>
      {[...Array(count)].map((_, i) => (
        <RoundedBox key={i} args={[0.9, 2.1, 0.08]} radius={0.04} smoothness={3} position={[i * 1.2, 1.05, 0]}>
          <meshStandardMaterial color={i % 2 ? "#8d5524" : "#b0722c"} />
        </RoundedBox>
      ))}
      <Sign text="PORTAS & ESQUADRIAS" position={[3, 2.6, 0]} color="#16a34a" w={8} />
    </group>
  );
}

function BathroomIslands({ cols = 3, rows = 2, position = [-8, 0.6, -2] }) {
  // ilhas com vasos/cubas (formas simplificadas)
  const items = [];
  for (let x = 0; x < cols; x++) {
    for (let z = 0; z < rows; z++) {
      items.push(
        <group key={`${x}-${z}`} position={[x * 3, 0, z * 2]}>
          {/* base */}
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.4, 1.2]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
          {/* cuba redonda */}
          <mesh position={[-0.5, 0.6, 0]} castShadow>
            <sphereGeometry args={[0.35, 20, 20]} />
            <meshStandardMaterial color="white" roughness={0.35} />
          </mesh>
          {/* vaso sanitário simplificado */}
          <group position={[0.6, 0.5, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <capsuleGeometry args={[0.22, 0.35, 2, 12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0.35, -0.15]}>
              <boxGeometry args={[0.28, 0.25, 0.15]} />
              <meshStandardMaterial color="#f3f4f6" />
            </mesh>
          </group>
        </group>
      );
    }
  }
  return (
    <group position={position}>
      {items}
      <Sign text="LOUÇAS & BANHEIROS" position={[3, 2.6, 0]} color="#8b5cf6" w={8} />
    </group>
  );
}

function PaintAisle({ lanes = 2, length = 10, position = [0, 1, 6] }) {
  // gôndolas com tintas
  return (
    <group position={position}>
      <Gondola length={length} position={[0, 1.2, 0]} />
      {lanes > 1 && <Gondola length={length} position={[3.2, 1.2, 0]} />}
      <Sign text="TINTAS" position={[1.6, 2.6, 0]} color="#f59e0b" w={5} />
    </group>
  );
}

function ToolsWall({ width = 10, position = [-10, 1.2, 6] }) {
  // painel perfurado com ferramentas
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[width, 2.4, 0.2]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {[...Array(24)].map((_, i) => (
        <mesh key={i} position={[-width / 2 + 0.6 + (i % 8) * 1.2, 0.4 + Math.floor(i / 8) * 0.8, 0.15]}>
          <boxGeometry args={[0.8, 0.08, 0.08]} />
          <meshStandardMaterial color={i % 2 ? "#ef4444" : "#3b82f6"} />
        </mesh>
      ))}
      <Sign text="FERRAMENTAS" position={[0, 2.6, 0.5]} color="#10b981" w={7} />
    </group>
  );
}

function KitchensShow({ position = [10, 0.6, 6] }) {
  // mini ambientes de cozinha
  return (
    <group position={position}>
      {[0, 1].map((i) => (
        <group key={i} position={[i * 4, 0, 0]}>
          {/* balcão */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.9, 0.6]} />
            <meshStandardMaterial color={i % 2 ? "#9ca3af" : "#cbd5e1"} />
          </mesh>
          {/* tampo */}
          <mesh position={[0, 0.92, 0]} castShadow>
            <boxGeometry args={[3.2, 0.06, 0.62]} />
            <meshStandardMaterial color="#1f2937" metalness={0.2} roughness={0.4} />
          </mesh>
          {/* pia + cuba */}
          <mesh position={[0.5, 0.98, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 24]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
          </mesh>
          <Sign text="COZINHAS" position={[0, 2.4, 0]} color="#3b82f6" w={4} />
        </group>
      ))}
    </group>
  );
}

/** Camera helper **/
function CameraRig({ focus, setFocus }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...focus));
  useFrame((_, dt) => {
    // interpolação suave
    target.current.lerp(new THREE.Vector3(...focus), 0.08);
    camera.position.lerp(new THREE.Vector3(target.current.x + 10, 8, target.current.z + 10), 0.08);
  });
  return null;
}

/** Cena principal **/
function Store({ visible }) {
  const W = 32; // largura total
  const H = 20; // profundidade total
  const lights = useMemo(() => {
    const arr = [];
    for (let x = -W / 2 + 2; x <= W / 2 - 2; x += 4) {
      for (let z = -H / 2 + 2; z <= H / 2 - 2; z += 4) {
        arr.push([x, 6.2, z]);
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {/* piso geral */}
      <SectionFloor w={W} h={H} color="#f7f7f7" />

      {/* corredores principais (faixas) */}
      <SectionFloor w={W} h={2} color="#eef2ff" position={[0, 0.011, 0]} />
      <SectionFloor w={2} h={H} color="#eef2ff" position={[0, 0.012, 0]} />

      {/* forro/treliça */}
      <CeilingGrid w={W} h={H} />

      {/* luminárias pendentes */}
      {lights.map((p, i) => (
        <PendantLight key={i} position={p} intensity={2.1} />
      ))}

      {/* setores */}
      {visible.revestimentos && (
        <group position={[-6, 0, -4]}>
          <WallRack width={14} rows={10} />
          {/* pilhas de paletes no centro */}
          {[...Array(9)].map((_, i) => (
            <PalletStack key={i} position={[i % 3 * 2.4, 0.5, -2 + Math.floor(i / 3) * 2.2]} layers={4} />
          ))}
        </group>
      )}

      {visible.portas && <DoorShowcase position={[6, 1, -2]} />}

      {visible.banheiros && <BathroomIslands position={[-10, 0.6, -1]} />}

      {visible.tintas && <PaintAisle lanes={2} length={10} position={[0, 1, 6]} />}

      {visible.ferramentas && <ToolsWall position={[-10, 1.2, 6]} />}

      {visible.cozinhas && <KitchensShow position={[10, 0.6, 6]} />}

      {/* ilhas promocionais na entrada */}
      {visible.ilhas && (
        <group position={[0, 0, -8]}>
          {[...Array(3)].map((_, i) => (
            <group key={i} position={[i * 3.2 - 3.2, 0, 0]}>
              <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.6, 0.5, 1.4]} />
                <meshStandardMaterial color="#dbeafe" />
              </mesh>
              <Float floatIntensity={0.8} rotationIntensity={0.2}>
                <Sign text={i === 1 ? "FINANCIAMENTO" : "OFERTAS"} position={[0, 1.8, 0]} color={i === 1 ? "#ef4444" : "#0ea5e9"} w={i === 1 ? 5 : 3.6} />
              </Float>
            </group>
          ))}
        </group>
      )}

      {/* luz ambiente */}
      <ambientLight intensity={0.3} />
    </group>
  );
}

export default function App() {
  const [visible, setVisible] = useState({
    revestimentos: true,
    portas: true,
    banheiros: true,
    tintas: true,
    ferramentas: true,
    cozinhas: true,
    ilhas: true,
  });
  const [focus, setFocus] = useState([0, 0, 0]);

  const focusAreas = {
    Entrada: [0, 0, -8],
    Revestimentos: [-6, 0, -4],
    Portas: [6, 0, -2],
    Banheiros: [-10, 0, -1],
    Tintas: [0, 0, 6],
    Ferramentas: [-10, 0, 6],
    Cozinhas: [10, 0, 6],
    Centro: [0, 0, 0],
  };

  return (
    <div className="w-full h-full">
      <div className="absolute inset-0">
        <Canvas shadows camera={{ position: [12, 9, 12], fov: 45 }}>
          <Suspense fallback={<Html center>Carregando cena…</Html>}>
            <color attach="background" args={["#ffffff"]} />
            <CameraRig focus={focus} setFocus={setFocus} />
            <Store visible={visible} />
            <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={deg(80)} />
            {/* chão reflexivo opcional */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[200, 200]} />
              <shadowMaterial opacity={0.15} />
            </mesh>
          </Suspense>
        </Canvas>
      </div>

      {/* Painel de UI */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-2xl shadow-xl p-4 w-72 space-y-3 text-sm">
        <h2 className="text-lg font-semibold">Loja 3D – Setores</h2>
        {Object.keys(visible).map((key) => (
          <label key={key} className="flex items-center justify-between py-1">
            <span className="capitalize">{key}</span>
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
            />
          </label>
        ))}
        <div className="border-t pt-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(focusAreas).map(([name, vec]) => (
              <button key={name} onClick={() => setFocus(vec)} className="px-2 py-1 rounded-xl bg-gray-900 text-white hover:bg-gray-700">
                {name}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 pt-1">Dica: o layout está em escala ~32m x 20m com pé-direito de 6m.</p>
      </div>

      {/* Legenda/Mapa simples */}
      <div className="absolute bottom-3 left-3 bg-white/90 rounded-2xl shadow-lg p-3">
        <div className="text-xs">
          <div className="font-semibold mb-1">Mapa de setores</div>
          <ul className="space-y-0.5">
            <li><span className="inline-block w-3 h-3 bg-sky-200 mr-2"></span> Corredores principais</li>
            <li>Revestimentos (parede esquerda)</li>
            <li>Portas & Esquadrias (meia direita)</li>
            <li>Louças & Banheiros (fundo esquerdo)</li>
            <li>Tintas (centro posterior)</li>
            <li>Ferramentas (parede fundo esquerda)</li>
            <li>Cozinhas (fundo direita)</li>
            <li>Ilhas promocionais (entrada)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
