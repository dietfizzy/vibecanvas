import Buttplug from "buttplug";
let client: any = null;
export async function connectToy() {
  if (client?.isConnected) return client;
  const connector = new Buttplug.ButtplugWebsocketClientConnector("ws://localhost:12345");
  client = new Buttplug.ButtplugClient("VibeCanvas");
  await client.connect(connector);
  await client.startScanning();
  console.log("Found toys:", client.devices.map((d: any) => d.name));
  return client;
}
export async function vibratePattern(pattern: any) {
  if (!client) await connectToy();
  const start = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= pattern.durationMs && !pattern.loop) {
      clearInterval(interval);
      return;
    }
    const t = elapsed % pattern.durationMs;
    pattern.tracks.forEach((track: any, i: number) => {
      let intensity = 0;
      for (let j = 1; j < track.points.length; j++) {
        const a = track.points[j-1];
        const b = track.points[j];
        if (t >= a.timeMs && t <= b.timeMs) {
          const lerp = (t - a.timeMs) / (b.timeMs - a.timeMs);
          intensity = a.intensity + (b.intensity - a.intensity) * lerp;
          break;
        }
      }
      client?.devices[i]?.send(new Buttplug.VibrateCmd(intensity / 100));
    });
  }, 30);
}
