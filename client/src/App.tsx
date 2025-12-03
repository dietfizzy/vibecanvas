import { useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import {
  connectToServer,
  startScanning,
  disconnect,
  playPattern,
  stopPattern,
  setDeviceCallback,
  setStatusCallback,
  getDevices,
  setVibration,
  type VibePattern,
} from './lib/buttplug';
import type { ButtplugClientDevice } from 'buttplug';
import './index.css';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'scanning';

export default function App() {
  const [points, setPoints] = useState<Array<{ timeMs: number; intensity: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [devices, setDevices] = useState<ButtplugClientDevice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testIntensity, setTestIntensity] = useState(0);

  // pattern is 15 seconds long
  const duration = 15000;
  const canvasWidth = 800;
  const canvasHeight = 400;

  // setup callbacks when component mounts
  useEffect(() => {
    setDeviceCallback((devs) => setDevices([...devs]));
    setStatusCallback((s) => setStatus(s));
    return () => { disconnect(); };
  }, []);

  const handleConnect = async () => {
    setError(null);
    try { 
      await connectToServer(); 
    } catch (e: any) { 
      setError(e.message); 
    }
  };

  const handleScan = async () => {
    setError(null);
    try { 
      await startScanning(); 
    } catch (e: any) { 
      setError(e.message); 
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setIsPlaying(false);
  };

  const handleMouseDown = () => setIsDrawing(true);
  const handleMouseUp = () => setIsDrawing(false);

  // track mouse position and convert to time/intensity
  const handleMove = useCallback((e: any) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // x = time, y = intensity (flipped so top is 100%)
    const timeMs = Math.max(0, Math.min(duration, (pos.x / canvasWidth) * duration));
    const intensity = Math.max(0, Math.min(100, 100 - (pos.y / canvasHeight) * 100));
    
    setPoints((prev) => [...prev, { timeMs, intensity }]);
  }, [isDrawing, duration, canvasWidth, canvasHeight]);

  const handlePlay = () => {
    if (devices.length === 0) {
      setError('No devices connected. Scan for devices first.');
      return;
    }
    
    const sortedPoints = [...points].sort((a, b) => a.timeMs - b.timeMs);
    
    if (sortedPoints.length < 2) {
      setError('Draw a pattern on the canvas first (at least 2 points).');
      return;
    }
    
    const pattern: VibePattern = {
      durationMs: duration,
      loop: true,
      tracks: [{ motorId: '0', points: sortedPoints }],
    };
    
    setError(null);
    setIsPlaying(true);
    playPattern(pattern);
  };

  const handleStop = () => {
    stopPattern();
    setIsPlaying(false);
  };

  const handleClear = () => {
    setPoints([]);
    if (isPlaying) handleStop();
  };

  const handleTestVibration = async (intensity: number) => {
    setTestIntensity(intensity);
    if (devices.length > 0) {
      await setVibration(intensity / 100);
    }
  };

  // convert points to flat array for konva Line
  const linePoints = points
    .sort((a, b) => a.timeMs - b.timeMs)
    .flatMap((p) => [
      (p.timeMs / duration) * canvasWidth,
      canvasHeight - (p.intensity / 100) * canvasHeight,
    ]);

  const statusText = {
    disconnected: 'DISCONNECTED',
    connecting: 'CONNECTING...',
    connected: 'CONNECTED',
    scanning: 'SCANNING...',
  };

  return (
    <div className="app-container">
      <h1>VibeCanvas</h1>

      {/* connection controls */}
      <div className="panel">
        <div className="connection-row">
          <span className={`status ${status}`}>{statusText[status]}</span>
          <div className="controls">
            {status === 'disconnected' && (
              <button className="btn-pink" onClick={handleConnect}>Connect to Intiface</button>
            )}
            {status === 'connected' && (
              <>
                <button className="btn-green" onClick={handleScan}>Scan for Toys</button>
                <button className="btn-outline" onClick={handleDisconnect}>Disconnect</button>
              </>
            )}
            {status === 'scanning' && (
              <span className="scanning-text">Searching for devices...</span>
            )}
          </div>
        </div>

        {/* show connected devices */}
        {devices.length > 0 && (
          <div className="devices">
            <h3>Connected Devices:</h3>
            <ul>
              {devices.map((d, i) => (
                <li key={i}>
                  <span className="device-name">{d.name}</span>
                  {d.vibrateAttributes.length > 0 && <span className="device-tag">vibrate</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* test slider */}
        {devices.length > 0 && (
          <div className="test-slider">
            <label>Test Vibration: {testIntensity}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={testIntensity}
              onChange={(e) => handleTestVibration(Number(e.target.value))}
              className="slider"
            />
          </div>
        )}
      </div>

      {/* error message */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>X</button>
        </div>
      )}

      {/* drawing canvas */}
      <div className="canvas-wrapper">
        <div className="canvas-label label-top">100%</div>
        <div className="canvas-label label-bottom">0%</div>
        <div className="canvas-label label-left">0s</div>
        <div className="canvas-label label-right">{duration / 1000}s</div>

        <Stage
          width={canvasWidth}
          height={canvasHeight}
          className="canvas"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMove}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onTouchMove={handleMove}
        >
          <Layer>
            {/* background */}
            <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#f5f5f0" />
            
            {/* grid lines */}
            {[...Array(5)].map((_, i) => (
              <Line
                key={`h${i}`}
                points={[0, (canvasHeight / 4) * i, canvasWidth, (canvasHeight / 4) * i]}
                stroke="#1a1a1a20"
                strokeWidth={1}
              />
            ))}
            {[...Array(16)].map((_, i) => (
              <Line
                key={`v${i}`}
                points={[(canvasWidth / 15) * i, 0, (canvasWidth / 15) * i, canvasHeight]}
                stroke="#1a1a1a20"
                strokeWidth={1}
              />
            ))}
            
            {/* the drawn pattern */}
            {linePoints.length >= 4 && (
              <Line
                points={linePoints}
                stroke="#1a1a1a"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                shadowColor="#000000"
                shadowBlur={10}
                shadowOpacity={0.4}
              />
            )}
          </Layer>
        </Stage>

        <p className="hint">Draw on the canvas to create a vibration pattern. X = time, Y = intensity</p>
      </div>

      {/* playback buttons */}
      <div className="controls">
        {!isPlaying ? (
          <button className="btn-pink" onClick={handlePlay} disabled={points.length < 2}>PLAY PATTERN</button>
        ) : (
          <button className="btn-green" onClick={handleStop}>STOP</button>
        )}
        <button className="btn-outline" onClick={handleClear}>CLEAR</button>
      </div>

      {/* instructions */}
      <div className="instructions">
        <h3>How to use:</h3>
        <ol>
          <li>Download and run <a href="https://intiface.com/central/" target="_blank" rel="noopener">Intiface Central</a></li>
          <li>Start the server in Intiface Central</li>
          <li>Click "Connect to Intiface" above</li>
          <li>Turn on your toy and click "Scan for Toys"</li>
          <li>Draw a pattern on the canvas</li>
          <li>Hit Play and enjoy!</li>
        </ol>
      </div>
    </div>
  );
}
