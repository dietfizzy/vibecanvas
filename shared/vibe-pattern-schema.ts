// pattern types for saving/loading later

export interface MotorTrack {
  motorId: string;
  points: Array<{ timeMs: number; intensity: number }>;
}

export interface VibePattern {
  version: "1.0";
  name: string;
  durationMs: number;
  loop: boolean;
  tracks: MotorTrack[];
  createdAt: number;
}
