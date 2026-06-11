import type { ConfigContext, ExpoConfig } from "expo/config";

// ── Environment separation ──────────────────────────────────────────────────
// APP_VARIANT (set per EAS build profile in eas.json) gives each environment its
// OWN package name + display name, so local / staging / production apps can all
// be installed side-by-side and never clash. The API base URL + OTA channel are
// wired per profile in eas.json (EXPO_PUBLIC_API_BASE_URL + channel):
//   development → local web (auto-derived from the Metro host)
//   staging     → staging web (Railway)
//   production  → prod web
// Everything else (plugins, permissions, projectId, updates URL, runtimeVersion)
// is inherited from app.json unchanged.

type Variant = "development" | "staging" | "production";

const VARIANTS: Record<Variant, { name: string; pkg: string }> = {
  development: { name: "Hobo Enterprise (Dev)", pkg: "com.hobostays.enterprise.dev" },
  staging: { name: "Hobo Enterprise (Staging)", pkg: "com.hobostays.enterprise.staging" },
  production: { name: "Hobo Enterprise", pkg: "com.hobostays.enterprise" },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = (process.env.APP_VARIANT as Variant) || "production";
  const v = VARIANTS[variant] ?? VARIANTS.production;

  return {
    ...(config as ExpoConfig),
    name: v.name,
    android: { ...config.android, package: v.pkg },
    ios: { ...config.ios, bundleIdentifier: v.pkg },
  };
};
