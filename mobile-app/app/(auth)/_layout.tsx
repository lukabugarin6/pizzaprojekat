import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../context/authContext";

export default function AuthLayout() {
  const { isHydrating, isLoggedIn } = useAuth();

  if (isHydrating) return null; // ili splash loader

  if (isLoggedIn) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
