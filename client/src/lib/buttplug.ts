import {
  ButtplugClient,
  ButtplugBrowserWebsocketClientConnector,
  ButtplugClientDevice,
} from "buttplug";

// global state for the connection
let client: ButtplugClient | null = null;
let devices: ButtplugClientDevice[] = [];
let activePatternInterval: ReturnType<typeof setInterval> | null = null;

// callbacks to update the UI when stuff changes
type DeviceCallback = (devices: ButtplugClientDevice[]) => void;
type StatusCallback = (status: "disconnected" | "connecting" | "connected" | "scanning") => void;

let onDevicesChange: DeviceCallback | null = null;
let onStatusChange: StatusCallback | null = null;

export function setDeviceCallback(cb: DeviceCallback) {
  onDevicesChange = cb;
}

export function setStatusCallback(cb: StatusCallback) {
  onStatusChange = cb;
}

export function getDevices(): ButtplugClientDevice[] {
  return devices;
}

export function isConnected(): boolean {
  return client?.connected ?? false;
}

// connects to intiface central - make sure its running first!
export async function connectToServer(address = "ws://127.0.0.1:12345"): Promise<void> {
  if (client?.connected) {
    console.log("Already connected");
    return;
  }

  onStatusChange?.("connecting");

  try {
    client = new ButtplugClient("VibeCanvas");

    // listen for new devices
    client.addListener("deviceadded", (device: ButtplugClientDevice) => {
      console.log("Device connected:", device.name);
      devices = [...client!.devices];
      onDevicesChange?.(devices);
    });

    client.addListener("deviceremoved", (device: ButtplugClientDevice) => {
      console.log("Device disconnected:", device.name);
      devices = [...client!.devices];
      onDevicesChange?.(devices);
    });

    client.addListener("disconnect", () => {
      console.log("Disconnected from server");
      devices = [];
      onDevicesChange?.([]);
      onStatusChange?.("disconnected");
    });

    const connector = new ButtplugBrowserWebsocketClientConnector(address);
    await client.connect(connector);

    console.log("Connected!");
    onStatusChange?.("connected");
  } catch (err) {
    console.error("Connection failed:", err);
    onStatusChange?.("disconnected");
    throw new Error("Could not connect to Intiface Central. Is it running?");
  }
}

// scans for bluetooth devices for 5 seconds
export async function startScanning(): Promise<void> {
  if (!client?.connected) throw new Error("Not connected yet");

  onStatusChange?.("scanning");
  await client.startScanning();

  // stop after 5 sec
  setTimeout(async () => {
    if (client?.connected) {
      await client.stopScanning();
      devices = [...client.devices];
      onDevicesChange?.(devices);
      onStatusChange?.("connected");
    }
  }, 5000);
}

export async function stopAllDevices(): Promise<void> {
  if (activePatternInterval) {
    clearInterval(activePatternInterval);
    activePatternInterval = null;
  }

  for (const device of devices) {
    try { 
      await device.stop(); 
    } catch (e) { 
      // sometimes this fails, just ignore it
    }
  }
}

// intensity should be 0-1
export async function setVibration(intensity: number, deviceIndex = 0): Promise<void> {
  const device = devices[deviceIndex];
  if (!device) return;

  const clamped = Math.max(0, Math.min(1, intensity));

  try {
    if (device.vibrateAttributes.length > 0) {
      await device.vibrate(clamped);
    }
  } catch (e) {
    console.error("Vibrate failed:", e);
  }
}

export interface PatternPoint { 
  timeMs: number; 
  intensity: number; // 0-100
}

export interface VibePattern {
  durationMs: number;
  loop: boolean;
  tracks: Array<{ motorId: string; points: PatternPoint[]; }>;
}

// plays a pattern by interpolating between points
export function playPattern(pattern: VibePattern): void {
  if (activePatternInterval) clearInterval(activePatternInterval);
  if (devices.length === 0) return;

  const start = Date.now();

  activePatternInterval = setInterval(() => {
    const elapsed = Date.now() - start;

    // check if done
    if (elapsed >= pattern.durationMs && !pattern.loop) {
      clearInterval(activePatternInterval!);
      activePatternInterval = null;
      stopAllDevices();
      return;
    }

    const t = elapsed % pattern.durationMs;

    pattern.tracks.forEach((track, trackIndex) => {
      const pts = [...track.points].sort((a, b) => a.timeMs - b.timeMs);
      let intensity = 0;

      if (pts.length === 1) {
        intensity = pts[0].intensity;
      } else if (pts.length > 1) {
        // find which two points were between and lerp
        for (let j = 0; j < pts.length - 1; j++) {
          if (t >= pts[j].timeMs && t <= pts[j+1].timeMs) {
            const lerp = (t - pts[j].timeMs) / (pts[j+1].timeMs - pts[j].timeMs);
            intensity = pts[j].intensity + (pts[j+1].intensity - pts[j].intensity) * lerp;
            break;
          }
        }
        // handle edges
        if (t < pts[0].timeMs) intensity = pts[0].intensity;
        else if (t > pts[pts.length-1].timeMs) intensity = pts[pts.length-1].intensity;
      }

      setVibration(intensity / 100, trackIndex);
    });
  }, 30); // ~33fps update rate
}

export function stopPattern(): void {
  if (activePatternInterval) { 
    clearInterval(activePatternInterval); 
    activePatternInterval = null; 
  }
  stopAllDevices();
}

export async function disconnect(): Promise<void> {
  await stopAllDevices();
  if (client?.connected) await client.disconnect();
  client = null;
  devices = [];
  onDevicesChange?.([]);
  onStatusChange?.("disconnected");
}
