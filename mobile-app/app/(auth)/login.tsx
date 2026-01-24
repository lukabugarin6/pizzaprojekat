// app/(auth)/login.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/authContext";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "../../components/brand-logo-svg";

export default function LoginScreen() {
  const { isHydrating, isLoggedIn, login } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return !loading && email.trim().length > 0 && pass.length > 0;
  }, [email, pass, loading]);

  if (isHydrating) return null;
  if (isLoggedIn) return <Redirect href="/(tabs)" />;

  const onLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      await login(email.trim(), pass);
    } catch (e: any) {
      Alert.alert("Login failed", e?.message ?? "Try again");
    } finally {
      setLoading(false);
    }
  };

  // ✅ theme tokens (crno/belo)
  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const placeholder = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "#000" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";

  const btnBg = isDark ? "#fff" : "#000";
  const btnFg = isDark ? "#000" : "#fff";

  // ✅ disabled: dark tema “manje sivo”
  const disabledStyle = isDark
    ? { opacity: 0.65 } // manje sivo nego 0.45
    : { opacity: 0.45 };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={[styles.safe, { backgroundColor: bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.page, { backgroundColor: bg }]}>
            <View style={styles.card}>
              {/* ✅ SVG logo menja boju */}
              <View style={styles.logoWrap}>
                <BrandLogo color={fg} />
              </View>

              <Text style={[styles.title, { color: fg }]}>Dobrodošli!</Text>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: fg }]}>Email</Text>

                  <View
                    style={[
                      styles.inputWrap,
                      { borderColor: border, backgroundColor: inputBg },
                    ]}
                  >
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email"
                      placeholderTextColor={placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      style={[styles.input, { color: fg }]}
                      selectionColor={fg}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: fg }]}>Password</Text>

                  <View
                    style={[
                      styles.inputWrap,
                      { borderColor: border, backgroundColor: inputBg },
                    ]}
                  >
                    <TextInput
                      value={pass}
                      onChangeText={setPass}
                      placeholder="Password"
                      placeholderTextColor={placeholder}
                      secureTextEntry={!showPass}
                      autoCapitalize="none" // ✅ ne kapitalizuje
                      autoCorrect={false}
                      textContentType="password"
                      autoComplete="password"
                      style={[styles.input, { color: fg, paddingRight: 44 }]} // space for eye
                      selectionColor={fg}
                      returnKeyType="done"
                      onSubmitEditing={onLogin}
                    />

                    <TouchableOpacity
                      onPress={() => setShowPass((v) => !v)}
                      style={styles.eyeBtn}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPass ? "Hide password" : "Show password"
                      }
                    >
                      <Ionicons
                        name={showPass ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={
                          isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    { backgroundColor: btnBg },
                    !canSubmit && disabledStyle,
                  ]}
                  onPress={onLogin}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={btnFg} />
                  ) : (
                    <Text style={[styles.btnText, { color: "#e67428" }]}>
                      Uloguj Se
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  page: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },

  card: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 420,
    paddingVertical: 18,
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "600",
    marginBottom: 18,
  },

  form: { gap: 12 },
  field: { gap: 6 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // ✅ wrap to place eye icon inside
  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    position: "relative",
    justifyContent: "center",
  },

  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },

  eyeBtn: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  btn: {
    height: 46,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderRadius: 0,
  },

  btnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
