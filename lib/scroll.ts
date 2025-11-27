export const SCROLL_CONTAINER_ID = "scroll-container";
export const HEADER_OFFSET = 80; // approximate header height in px

export const scrollToSection = (id: string) => {
  if (typeof document === "undefined") return;

  const container = document.getElementById(SCROLL_CONTAINER_ID);
  const target = document.getElementById(id);

  if (!container || !target) return;

  const targetTop = target.offsetTop;

  container.scrollTo({
    top: Math.max(targetTop - HEADER_OFFSET, 0),
    behavior: "smooth",
  });
};
