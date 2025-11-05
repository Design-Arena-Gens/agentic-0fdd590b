import dynamic from "next/dynamic";

const GlobeView = dynamic(() => import("../components/GlobeView.jsx"), { ssr: false });

export default function Home() {
  return <GlobeView />;
}
