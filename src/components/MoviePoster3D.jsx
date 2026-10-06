import React, { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Plane } from '@react-three/drei'
import { motion, animate } from 'framer-motion'
import * as THREE from 'three'
import './MoviePoster3D.css'

// TODO: Install @react-three/postprocessing and @react-three/drei for bloom & chromatic aberration:
// npm install @react-three/postprocessing @react-three/drei
// Then import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'

// Holographic shimmer GLSL shader
const holoVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const holoFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uIntensity;
  uniform vec3 uCameraPos;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  // Pseudo-random hash
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 viewDir = normalize(uCameraPos - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);

    // Holographic scan lines
    float scanLine = sin(vPosition.y * 80.0 + uTime * 3.0) * 0.5 + 0.5;
    scanLine = smoothstep(0.3, 0.7, scanLine);

    // Color shifting based on view angle
    float angle = dot(viewDir, vNormal);
    vec3 holoColor = mix(uColor1, uColor2, fresnel + sin(uTime * 0.5 + vUv.x * 10.0) * 0.3);

    // Shimmer effect
    float shimmer = hash(vUv * uTime * 0.1 + floor(uTime * 2.0)) * 0.5 + 0.5;
    shimmer = smoothstep(0.8, 1.0, shimmer) * 0.3;

    // Grid pattern
    vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5) / fwidth(vUv * 20.0);
    float gridLine = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Combine
    float alpha = fresnel * 0.6 + scanLine * 0.15 + shimmer + gridLine * 0.05;
    alpha = clamp(alpha * uIntensity, 0.0, 1.0);

    // Base poster color underneath
    vec3 posterBase = vec3(0.02, 0.02, 0.05);
    vec3 finalColor = mix(posterBase, holoColor, alpha * 0.8 + fresnel * 0.4);

    // Emissive glow
    finalColor += holoColor * fresnel * 0.5 * uIntensity;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

const posterData = [
  { id: 1, title: 'NEON DREAMS', position: [-5, 2, -3], rotation: [0, 0.3, 0], scale: 1.4, color: '#ff164f' },
  { id: 2, title: 'STAR VOID', position: [4.5, -1, -5], rotation: [0, -0.5, 0.15], scale: 1.2, color: '#9b2cff' },
  { id: 3, title: 'ECHO PROTOCOL', position: [-3, -2.5, -7], rotation: [0, 0.8, -0.1], scale: 1.6, color: '#ff4d8d' },
  { id: 4, title: 'CRIMSON HEIGHT', position: [6, 3, -2], rotation: [0, -0.2, 0.25], scale: 1.1, color: '#ff164f' },
  { id: 5, title: 'ZERO HOUR', position: [-6.5, 0.5, -6], rotation: [0, 0.6, 0.1], scale: 1.3, color: '#9b2cff' },
  { id: 6, title: 'PHANTOM RISE', position: [2, 4, -8], rotation: [0, -0.7, -0.15], scale: 1.5, color: '#ff4d8d' },
  { id: 7, title: 'ABYSSAL', position: [-4.5, -3.5, -4], rotation: [0, 0.15, 0.2], scale: 1.0, color: '#ff164f' },
  { id: 8, title: 'PRISM FALL', position: [3.5, -3, -3.5], rotation: [0, -0.4, -0.2], scale: 1.25, color: '#9b2cff' },
]

const MoviePoster3D = ({
  data,
  mousePosition,
  onClick,
  isPulledOut,
  isHovered,
}) => {
  const meshRef = useRef()
  const [isHoveredLocal, setIsHoveredLocal] = useState(false)
  const [clicked, setClicked] = useState(false)

  const isSelected = isPulledOut === data.id

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const mouse = mousePosition || { x: 0, y: 0 }

    // Subtle floating animation
    meshRef.current.position.y = data.position[1] + Math.sin(time * 0.5 + data.id * 0.7) * 0.15
    meshRef.current.rotation.y = data.position[1] * 0.1 + Math.sin(time * 0.3 + data.id) * 0.05

    // Parallax response to mouse (normalized -1 to 1)
    if (mouse) {
      meshRef.current.rotation.y += mouse.x * 0.1
      meshRef.current.rotation.x += mouse.y * 0.05
    }

    // Pull-out animation
    if (isSelected) {
      const targetScale = data.scale * 2.5
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.05)
      meshRef.current.scale.set(newScale, newScale, newScale)
      meshRef.current.position.z -= 0.05
      meshRef.current.position.y += 0.01
    } else {
      // Return to original scale
      const targetScale = data.scale
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.03)
      meshRef.current.scale.set(newScale, newScale, newScale)
    }

    // Hover scale
    const hoverTarget = isHoveredLocal || isHovered ? 1.15 : 1.0
    const currentS = meshRef.current.scale.x
    const lerpedS = THREE.MathUtils.lerp(currentS, hoverTarget, 0.1)
    if (!isSelected) {
      meshRef.current.scale.x = lerpedS
      meshRef.current.scale.y = lerpedS
      meshRef.current.scale.z = lerpedS
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    setClicked(true)
    onClick(data.id)
  }

  const handlePointerOver = () => setIsHoveredLocal(true)
  const handlePointerOut = () => setIsHoveredLocal(false)

  return (
    <>
      <mesh
        ref={meshRef}
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        className={`poster-mesh ${isSelected ? 'poster-mesh--pulled' : ''}`}
      >
        <planeGeometry args={[1, 1.5]} />
        <shaderMaterial
          vertexShader={holoVertexShader}
          fragmentShader={holoFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(data.color || '#ff164f') },
            uColor2: { value: new THREE.Color('#9b2cff') },
            uIntensity: { value: 0.8 },
            uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
          }}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Title label */}
      <Text
        position={[data.position[0], data.position[1] - 1.2, data.position[2]]}
        fontSize={0.25}
        color={isSelected ? '#ff164f' : '#ffffff'}
        anchorX="center"
        anchorY="top"
        font="https://fonts.gstatic.com/s/rajdhani/v18/LDI2apCSOBg7S-QT7d6dBw.woff2"
      >
        {data.title}
      </Text>

      {/* Detail overlay when pulled out */}
      {isSelected && (
        <group position={data.position}>
          <Plane args={[3, 4]} position={[0, 0, 0.1]}>
            <meshBasicMaterial
              color={new THREE.Color(data.color || '#ff164f')}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </Plane>
          <Text
            position={[0, 0.8, 0.3]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="center"
          >
            {data.title}
          </Text>
          <Text
            position={[0, 0.4, 0.3]}
            fontSize={0.15}
            color="#ff164f"
            anchorX="center"
            anchorY="center"
          >
            Click again to close
          </Text>
        </group>
      )}
    </>
  )
}

export default MoviePoster3D
