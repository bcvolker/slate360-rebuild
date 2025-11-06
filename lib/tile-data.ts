// File: lib/tile-data.ts
import { Tile } from "@/lib/types";
// Only one tileData export, with all features including iconName and title

export const tileData: Tile[] = [
	{
		id: "hero",
		title: "Your Vision, Instantly Realized.",
		subtitle: "Slate360 unifies BIM, 360 tours, analytics, and VR into one SaaS platform.",
		description:
			"Slate360 unifies BIM, 360 tours, analytics, and VR into one SaaS platform. Move beyond disconnected tools and discover your command center for the built environment.",
		features: [
			{ iconName: "LayoutGrid", title: "Unified Dashboard", text: "Access every workflow in one secure hub." },
			{ iconName: "Users", title: "Real-Time Collaboration", text: "Work seamlessly across office and field teams." },
			{ iconName: "BrainCircuit", title: "AI Analytics", text: "Forecast risks, costs, and performance." },
			{ iconName: "DatabaseZap", title: "Data Integration", text: "Connect with tools you already rely on." },
		],
		cta: "Request a Demo",
		viewerPosition: "right",
	},
	{
		id: "bim-studio",
		title: "Move Beyond the Desktop.",
		subtitle: "BIM Studio",
		description:
			"Our browser-based BIM Studio brings complex models into the cloud. No installs. No compatibility headaches. True field-to-office collaboration, wherever you are.",
		features: [
			{ iconName: "Box", title: "High-Fidelity Rendering", text: "Explore models with stunning detail on any device." },
			{ iconName: "GitCompareArrows", title: "Version Control", text: "Instantly track and compare design revisions." },
			{ iconName: "CheckSquare", title: "Clash Detection", text: "Identify conflicts before they become costly mistakes." },
			{ iconName: "MessageSquare", title: "Live Markup", text: "Annotate directly in 3D with your team." },
		],
		cta: "Explore BIM Studio",
		viewerPosition: "left",
	},
	{
		id: "tour-builder",
		title: "Immersive 360 Tours.",
		subtitle: "360 Tour Builder",
		description:
			"Transform site photos into interactive 360° walkthroughs. Add hotspots, embed media, and deliver clarity to every stakeholder.",
		features: [
			{ iconName: "Camera", title: "Drag-and-Drop Editor", text: "Build tours in minutes with no coding required." },
			{ iconName: "MonitorSmartphone", title: "VR Ready", text: "View projects at true scale with headset compatibility." },
		],
		cta: "Discover Tour Building",
		viewerPosition: "right",
	},
	{
		id: "content-studio",
		title: "Your Story, Beautifully Told.",
		subtitle: "Content Studio",
		description:
			"Produce polished visuals directly inside Slate360. Edit drone footage, generate timelapses, and share branded media instantly.",
		features: [
			{ iconName: "Film", title: "Built-in Video Editor", text: "Cut, overlay, and render without external software." },
			{ iconName: "Users", title: "Easy Sharing", text: "Deliver content to clients or post directly to social media." },
		],
		cta: "Learn About Content Studio",
		viewerPosition: "left",
	},
	{
		id: "geospatial",
		title: "Geospatial Intelligence + Robotics.",
		subtitle: "Geospatial & Robotics",
		description:
			"Integrate drone data, GNSS, and robotics into your projects. See your site from every angle with unmatched precision.",
		features: [
			{ iconName: "Globe2", title: "Survey-Grade Accuracy", text: "Integrate GNSS and LiDAR workflows seamlessly." },
			{ iconName: "Users", title: "Robotics Integration", text: "Control drones and robots from one interface." },
		],
		cta: "See Geospatial Tools",
		viewerPosition: "right",
	},
	{
		id: "analytics",
		title: "Insights that Drive Action.",
		subtitle: "Analytics & Reports",
		description:
			"Turn raw project data into predictive insights. Understand performance and deliver results faster, smarter, and with confidence.",
		features: [
			{ iconName: "BarChart3", title: "Custom Reports", text: "Tailor insights to stakeholder needs." },
			{ iconName: "BrainCircuit", title: "Predictive Modeling", text: "Spot risks before they impact timelines or budgets." },
		],
		cta: "Explore Analytics",
		viewerPosition: "left",
	},
	{
		id: "vr-ar",
		title: "Experience in True Scale.",
		subtitle: "VR/AR Studio",
		description:
			"Step inside your projects before they’re built. From immersive design reviews to client presentations, Slate360 VR/AR delivers the future of visualization.",
		features: [
			{ iconName: "MonitorSmartphone", title: "Immersive Review", text: "Walk through designs in virtual reality." },
			{ iconName: "Users", title: "Client Engagement", text: "Bring stakeholders into the model, wherever they are." },
		],
		cta: "Experience VR/AR",
		viewerPosition: "right",
	},
];
