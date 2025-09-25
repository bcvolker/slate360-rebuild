export interface Tile {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  cta: string;
  viewerPosition: 'left' | 'right';
  theme: 'light' | 'dark';
  media?: {
    src: string;
    alt: string;
  };
}

// Unified tileData export
export const tileData: Tile[] = [
  {
    id: 'hero',
    title: 'Slate360',
    subtitle: 'From Design to Reality',
    description:
      'The all-in-one platform for AEC professionals, integrating 3D modeling, geospatial tools, and advanced analytics to bring your designs to life faster and more efficiently than ever before.',
    features: [
      'Unified Project Dashboard',
      'Real-Time 3D Collaboration',
      'AI-Powered Analytics',
      'Seamless Data Integration',
    ],
    cta: 'Request a Demo',
    viewerPosition: 'right',
    theme: 'dark',
    media: { src: '/images/hero-analytics.png', alt: 'Slate360 Analytics Dashboard' },
  },
  {
    id: 'bim-studio',
    title: 'BIM Studio',
    subtitle: 'Precision 3D Modeling in the Cloud',
    description:
      'Collaborate on complex BIM models with real-time updates, version control, and integrated tools. Detect clashes automatically and streamline your design review process.',
    features: [
      'Cloud-Native 3D Viewer',
      'Real-Time Markup & Annotation',
      'Automated Clash Detection',
      'Version History & Comparison',
    ],
    cta: 'Explore BIM Studio',
    viewerPosition: 'left',
    theme: 'light',
    media: { src: '/images/bim-model.png', alt: 'Architectural BIM Model' },
  },
  {
    id: 'project-hub',
    title: 'Project Hub',
    subtitle: 'Your Single Source of Truth',
    description:
      'Organize all your project files, documents, and communication in one centralized hub. Ensure your entire team is working with the latest information, from concept to completion.',
    features: [
      'Centralized File Management',
      'Task & Milestone Tracking',
      'Team Communication Channels',
      'Granular Access Control',
    ],
    cta: 'Discover Project Hub',
    viewerPosition: 'right',
    theme: 'dark',
    media: { src: '/images/project-hub.png', alt: 'Project Hub Interface' },
  },
  // Add more tiles as needed
];
