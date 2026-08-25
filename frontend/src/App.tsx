import { LoadingScreen } from "./components/common/LoadingScreen";
import { useAuth } from "./features/auth/hooks/useAuth";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return <AppRoutes />;
}

export default App;
