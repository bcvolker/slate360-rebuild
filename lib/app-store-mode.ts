export const APP_STORE_MODE = process.env.NEXT_PUBLIC_APP_STORE_MODE !== "false";

export function shouldHideInAppStoreMode(comingSoon?: boolean) {
  return APP_STORE_MODE && Boolean(comingSoon);
}
