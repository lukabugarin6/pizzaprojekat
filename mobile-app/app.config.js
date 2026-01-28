export default {
  expo: {
    owner: "luka.bugarin",
    jsEngine: "hermes",
    name: "Pizza Project",
    slug: "pizzaproject",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/adaptive-icon.png",
    scheme: "com.pizzaproject",
    userInterfaceStyle: "automatic",

    reactNativeNewArchitectureIos: true,
    reactNativeNewArchitectureAndroid: true,
    updates: {
      url: "https://u.expo.dev/79579be3-55dd-4cda-8f50-cc19723fd493",
    },
    runtimeVersion: "1.0.1",
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
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
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
      favicon: "./assets/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          // optional, ali preporuka (ikonica za android notif)
          icon: "./assets/adaptive-icon.png",
          color: "#ffffff",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/adaptive-icon.png",
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
    ],

    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "79579be3-55dd-4cda-8f50-cc19723fd493",
      },
    },
  },
};
