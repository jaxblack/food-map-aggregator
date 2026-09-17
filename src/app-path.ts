export const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function appPath(path: `/${string}`): string {
  return `${APP_BASE_PATH}${path}`;
}
