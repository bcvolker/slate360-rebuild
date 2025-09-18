"use client";
import Header from "../components/ui/Header";
import React, { useEffect } from "react";
import Tile from "../components/ui/Tile";

// Intersection Observer for tile animations
function useTileAnimations() {
  useEffect(() => {
    const tiles = document.querySelectorAll('.tile-section');
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-slide-in');
        }
      });
    }, { threshold: 0.2 });
    tiles.forEach(tile => observer.observe(tile));
    return () => observer.disconnect();
  }, []);
}
// import SectionHeader from "../components/ui/SectionHeader";
// import Card from "../components/ui/Card";
// import InteractiveForm from "../components/ui/InteractiveForm";
// import MediaWrapper from "../components/ui/MediaWrapper";
// Framer Motion removed; using CSS animations

const tiles = [
  {
    id: "about",
    surface: "light",
    content: (
      <>
        {/* <SectionHeader
          title="Welcome to Slate360"
          subtitle="A modern, animated, snap-scrolling homepage for your ideas."
        /> */}
        <div className="max-w-xl mx-auto text-lg text-center mt-4 fade-slide-in">
          Slate360 is a showcase of beautiful, interactive, and responsive web design. Scroll down to explore features, demos, and more!
        </div>
      </>
    ),
  },
  {
    id: "features",
    surface: "dark",
    content: (
      <>
        {/* <SectionHeader
          title="Features"
          subtitle="What makes Slate360 unique?"
        /> */}
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          {/* <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Snap Scrolling</h3>
            <p>Each section snaps into view for a smooth, immersive experience.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Animated UI</h3>
            <p>Subtle, delightful animations powered by Framer Motion.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Expandable Media</h3>
            <p>Click images or videos to expand and focus on the content.</p>
          </Card> */}
        </div>
      </>
    ),
  },
  {
    id: "demos",
    surface: "light",
    content: (
      <>
        {/* <SectionHeader
          title="Demos"
          subtitle="See Slate360 in action"
        /> */}
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          {/* <MediaWrapper
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
            alt="Sample Image"
            type="image"
          />
          <MediaWrapper
            src="https://www.w3schools.com/html/mov_bbb.mp4"
            alt="Sample Video"
            type="video"
          /> */}
        </div>
      </>
    ),
  },
  {
    id: "contact",
    surface: "dark",
    content: (
      <>
        {/* <SectionHeader
          title="Contact"
          subtitle="Get in touch with us!"
        /> */}
  {/* <InteractiveForm /> */}
      </>
    ),
  },
] as const;

export default function HomePage() {
  useTileAnimations();
  return (
    <>
      <Header />
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          id={tile.id}
          surface={tile.surface}
          className="snap-start"
        >
          {tile.content}
        </Tile>
      ))}
    </>
  );
}
