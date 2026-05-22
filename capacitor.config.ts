import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.dwrat",
  appName: "مستخرج بيانات الدورات",
  webDir: "dist",
  // التطبيق يعمل عبر SSR على Lovable Cloud،
  // لذلك نوجّه WebView إلى الموقع المنشور مباشرة.
  server: {
    url: "https://date-dwrat.lovable.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
