export interface CameraFeed {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline";
}
