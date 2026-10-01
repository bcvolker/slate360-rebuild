const PRODUCT = [
  "/dashboard",
  "/projects",
  "/spatial-walkthrough",
  "/site-walks",
  "/site-walk",
  "/digital-twins",
  "/digital-twin",
  "/twin-studio",
  "/thermal-studio",
  "/slatedrop",
  "/tours",
  "/w/",
  "/portal/",
  "/preview/twin",
  "/my-account",
  "/more/",
];

export function isProductSurface(pathname: string): boolean {
  const path = pathname || "/";
  return PRODUCT.some((p) => path === p || path.startsWith(p));
}
