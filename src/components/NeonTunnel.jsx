import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useRef } from 'react';
function NeonRing() {
  const ref = useRef();
  useFrame(({ clock }) => { if(ref.current) ref.current.rotation.y = clock.getElapsedTime()*0.3; });
  return <line ref={ref} points={[[-30,0,30],[-30,0,-30],[30,0,-30],[30,0,30],[-30,0,30]]} color="#ff164f" lineWidth={2} />;
}
export default function NeonTunnel() {
  return <Canvas camera={{ position:[0,8,20] }} gl={{ alpha:true, antialias:false }}><ambientLight intensity={1.5}/><NeonRing/></Canvas>;
}
