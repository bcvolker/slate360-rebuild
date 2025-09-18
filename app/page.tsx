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
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import InteractiveForm from "../components/ui/InteractiveForm";
import MediaWrapper from "../components/ui/MediaWrapper";
// Framer Motion removed; using CSS animations

const tiles = [
  {
    id: "about",
    surface: "light",
    content: (
      <>
        <SectionHeader
          title="Welcome to Slate360"
          subtitle="A modern, animated, snap-scrolling homepage for your ideas."
        />
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
        <SectionHeader
          title="Features"
          subtitle="What makes Slate360 unique?"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Snap Scrolling</h3>
            <ul className="list-disc list-inside text-base text-brand-gray">
              <li>Each section snaps into view for a smooth, immersive experience.</li>
              <li>Mobile and desktop support.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Animated UI</h3>
            <ul className="list-disc list-inside text-base text-brand-gray">
              <li>Subtle, delightful CSS animations.</li>
              <li>Logo and tiles animate on scroll.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Expandable Media</h3>
            <ul className="list-disc list-inside text-base text-brand-gray">
              <li>Click images or videos to expand and focus on the content.</li>
              <li>Supports images, video, and custom embeds.</li>
            </ul>
          </Card>
        </div>
      </>
    ),
  },
  {
    id: "demos",
    surface: "light",
    content: (
      <>
        <SectionHeader
          title="Demos"
          subtitle="See Slate360 in action"
        />
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center mt-4">
          <MediaWrapper
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
            alt="Sample Image"
            type="image"
          />
          <MediaWrapper
            src="https://www.w3schools.com/html/mov_bbb.mp4"
            alt="Sample Video"
            type="video"
          />
        </div>
      </>
    ),
  },
  {
    id: "integrations",
    surface: "dark",
    content: (
      <>
        <SectionHeader
          title="Integrations"
          subtitle="Connect with your favorite tools"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">API Ready</h3>
            <p>Easy integration with REST and GraphQL APIs.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">CMS Support</h3>
            <p>Works with headless CMS like Contentful, Sanity, and more.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Analytics</h3>
            <p>Plug in Google Analytics, Plausible, and others.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Auth</h3>
            <p>Easy authentication with Auth0, Clerk, and more.</p>
          </Card>
        </div>
      </>
    ),
  },
  {
    id: "testimonials",
    surface: "light",
    content: (
      <>
        <SectionHeader
          title="Testimonials"
          subtitle="What our users say"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <Card>
            <p className="italic">“Slate360 made our homepage look amazing and modern. The snap scrolling is so smooth!”</p>
            <span className="block mt-2 font-bold text-brand-blue">— Alex, Designer</span>
          </Card>
          <Card>
            <p className="italic">“The expandable media and animated UI really impressed our clients.”</p>
            <span className="block mt-2 font-bold text-brand-blue">— Jamie, Developer</span>
          </Card>
        </div>
      </>
    ),
  },
  {
    id: "faq",
    surface: "dark",
    content: (
      <>
        <SectionHeader
          title="FAQ"
          subtitle="Frequently Asked Questions"
        />
        <div className="space-y-4 mt-4">
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Is Slate360 free?</h3>
            <p>Yes, Slate360 is open source and free to use for personal and commercial projects.</p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-blue text-lg mb-2">Can I use my own branding?</h3>
            <p>Absolutely! You can customize colors, logos, and content easily.</p>
          </Card>
        </div>
      </>
    ),
  },
  {
    id: "contact",
    surface: "light",
    content: (
      <>
        <SectionHeader
          title="Contact"
          subtitle="Get in touch with us!"
        />
        <InteractiveForm />
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
