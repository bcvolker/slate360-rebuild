export const CONTAINER_ID = "scroll-container";
export const HEADER_OFFSET = 60; // Reduced to 60 to ensure overlap and prevent sliver gap

export const scrollToSection = (id: string) => {
  if (typeof document === "undefined") return;

  const container = document.getElementById(CONTAINER_ID);
  const target = document.getElementById(id);

  if (!container || !target) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Scroll target or container missing: ${id}`);
    }
    return;
  }

  const targetTop = target.offsetTop;
  const scrollPos = Math.max(targetTop - HEADER_OFFSET, 0);

  container.scrollTo({
    top: scrollPos,
    behavior: "smooth",
  });
};
