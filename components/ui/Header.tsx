'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import Logo from './Logo';


const tileNavItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  { name: '360 Tour Builder', id: 'tour-builder' },
  { name: 'Content Creation', id: 'content-creation' },
  { name: 'Geospatial & Robotics', id: 'geospatial' },
  { name: 'Reports & Analytics', id: 'reports' },
  { name: 'VR/AR Lab', id: 'vr-ar-lab' },
];


export default function Header({ activeSection }: { activeSection: string | null; }) {
  // Split tile nav into two rows of 4 (pad with empty if needed)
  import Link from 'next/link';
  import Image from 'next/image';

  export default function Header() {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-transparent">
        <div className="mx-auto max-w-7xl">
          <Link href="/" aria-label="Go to Homepage">
            {/*
              This wrapper div creates a stable "bounding box" for the logo.
              By setting an explicit width, height, and position, we protect the
              image from external CSS rules that might be collapsing its dimensions or hiding it.
            */}
            <div style={{ width: '180px', height: '45px', position: 'relative' }}>
              <Image
                src="/slate360-logo.png"
                alt="Slate360 Logo"
                fill
                priority
                sizes="180px"
                className="logo"
                style={{
                  objectFit: 'contain',
                  // These styles override any global rules hiding images.
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1,
                }}
              />
            </div>
          </Link>
        </div>
      </header>
    );
  }