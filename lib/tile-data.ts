import { Tile } from "./types";
import { LayoutGrid, Users, BrainCircuit, DatabaseZap, GitCompareArrows, CheckSquare, MessageSquare, Camera, Film, BarChart3 } from "lucide-react";

export const tileData: Tile[] = [
	{
		id: "hero",
		title: "Your Vision, Instantly Realized.",
		subtitle: "Slate360",
		description:
			"Slate360 unifies modeling, analytics, and collaboration in one sleek SaaS platform.",
		features: [
			{
				icon: LayoutGrid,
				title: "Unified Dashboard",
				text: "Centralize files, tasks, and updates.",
			},
			{ icon: Users, title: "Collaboration", text: "Work in real-time with your team." },
			{ icon: BrainCircuit, title: "AI Insights", text: "Predict risks, costs, and delays." },
			{ icon: DatabaseZap, title: "Data Integration", text: "Plug into tools you already use." },
		],
		cta: "Request Demo",
		viewerPosition: "right",
	},
	{
		id: "bim-studio",
		title: "Move Beyond the Desktop.",
		subtitle: "BIM Studio",
		description: "Cloud-native BIM modeling with advanced rendering and clash detection.",
		features: [
			{ icon: Film, title: "High-Fidelity Rendering", text: "Smooth navigation of complex models." },
			{ icon: GitCompareArrows, title: "Version Control", text: "Compare revisions instantly." },
			{ icon: CheckSquare, title: "Clash Detection", text: "Spot conflicts early." },
			{ icon: MessageSquare, title: "Annotations", text: "Markup and share notes live." },
		],
		cta: "Explore BIM Studio",
		viewerPosition: "left",
	},
	{
		id: "analytics",
		title: "Data-Driven Decisions.",
		subtitle: "Reports & Analytics",
		description: "Custom reports and dashboards to track KPIs, thermal data, and forecasts.",
		features: [
			{ icon: BarChart3, title: "KPI Dashboards", text: "Stay on top of performance." },
			{ icon: BrainCircuit, title: "Predictive Analytics", text: "Spot risks before they happen." },
		],
		cta: "See Reports",
		viewerPosition: "right",
	},
	{
		id: "vr-studio",
		title: "Step Into the Future.",
		subtitle: "Virtual & AR Studio",
		description: "Immersive walkthroughs and design reviews before construction begins.",
		features: [
			{ icon: Camera, title: "1:1 Walkthroughs", text: "Experience projects at full scale." },
			{ icon: Camera, title: "Simulation Tools", text: "Run safety and design simulations." },
		],
		cta: "Try VR Studio",
		viewerPosition: "left",
	},
];
