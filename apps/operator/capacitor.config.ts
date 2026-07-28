import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.supermercadoparanaiba.checklist",
  appName: "Checklist Paranaíba",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    Preferences: {
      group: "br.com.supermercadoparanaiba.checklist",
    },
  },
};

export default config;
