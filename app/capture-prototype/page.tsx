import { CaptureScreen } from "./_components/CaptureScreen";

export const metadata = {
  title: "Capture · Slate360",
  description: "Mobile capture screen prototype for construction site walks.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function CapturePrototypePage() {
  return <CaptureScreen />;
}
