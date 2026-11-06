// iOSネイティブアプリ化（Capacitor）用設定ファイル
const config = {
  appId: "com.takuo.izakayamap",
  appName: "居酒屋開拓",
  webDir: "out",
  ios: {
    contentInset: "always",
    backgroundColor: "#16191e",
    allowsLinkPreview: false,
  },
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
};

export default config;
