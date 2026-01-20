export default {
  expo: {
    owner: "lukabugarin6@gmail.com",
    jsEngine: "hermes",
    name: "Pizzaproject",
    slug: "pizzaproject",
    version: "1.0.4",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "com.pizzaproject",
    userInterfaceStyle: "automatic",

    reactNativeNewArchitectureIos: true,
    reactNativeNewArchitectureAndroid: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pizzaproject",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        NSPhotoLibraryUsageDescription: "Allow access to save videos",
        NSCameraUsageDescription: "Allow access to camera",
        NSMicrophoneUsageDescription: "Allow access to microphone",
        NSLocationWhenInUseUsageDescription:
          "We use your location to set training location on the map.",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.pizzaproject",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "com.pizzaproject", host: "oauthredirect" },
            // mnoge lib-ove rade i bez host-a; dodaj i čisto scheme match
            { scheme: "com.pizzaproject" },
          ],
        },
      ],
    },

    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      "expo-apple-authentication",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "@react-native-community/datetimepicker",
        {
          android: {
            datePicker: {
              colorAccent: {
                light: "#FF5722",
              },
              textColorPrimary: {
                light: "#FF5722",
              },
            },
            timePicker: {
              background: {
                light: "#FF5722",
                dark: "#383838",
              },
              numbersBackgroundColor: {
                light: "#FF5722",
                dark: "#383838",
              },
            },
          },
        },
      ],
      "expo-secure-store",
      [
        "expo-video",
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],

    extra: {
      router: {
        origin: false,
      },
    },
  },
};
