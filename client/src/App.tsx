import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { connectToy, vibratePattern } from './lib/buttplug';
import '../index.css';

export default function App() {
  const [points, setPoints] = useState<Array<{timeMs:number;intensity:number}>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const duration = 15000;

  const handleMove = (e:any) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    const timeMs = (pos.x / 800) * duration;
    const intensity = 100 - (pos.y / 400 * 100);
    setPoints(p => [...p, {timeMs, intensity}]);
  };

  const play = async () => {
    const pattern = {
      version: "1.0", name: "Live", durationMs: duration, loop: true,
      tracks: [{ motorId: "0", points: points.sort((a,b)=>a.timeMs-b.timeMs) }],
      createdAt: Date.now()
    };
    await connectToy();
    vibratePattern(pattern);
  };

  return (
    <div style={{padding:'20px'}}>
      <h1>VibeCanvas</h1>
      <Stage width={800} height={400} className="canvas"
        onMouseDown={()=>setIsDrawing(true)} onMouseUp={()=>setIsDrawing(false)}
        onMouseMove={handleMove} onTouchMove={handleMove}>
        <Layer>
          <Line points={points.flatMap(p=>[p.timeMs*800/duration, 400-p.intensity*4])} stroke="#00ffff" strokeWidth={4} />
        </Layer>
      </Stage>
      <div style={{textAlign:'center', marginTop:20}}>
        <button onClick={play}>Play on Toy</button>
        <button onClick={()=>setPoints([])} style={{marginLeft:15}}>Clear</button>
      </div>
    </div>
  );
}
