import DesktopHome from "@/components/home/DesktopHome";
import MobileHome from "@/components/home/MobileHome";

export default function HomePage() {
  return (
    <>
      {/* Desktop & tablets */}
      <div className="hidden md:block">
        <DesktopHome />
      </div>

      {/* Mobile phones */}
      <div className="block md:hidden">
        <MobileHome />
      </div>
    </>
  );
}