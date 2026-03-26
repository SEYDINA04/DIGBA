/**
 * DIGBA — Routeur principal
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Rasff from "./pages/Rasff";
import History from "./pages/History";
import { LangProvider } from "./i18n/LangContext";
import OnboardingTour from "./components/onboarding/OnboardingTour";

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <OnboardingTour />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="rasff"   element={<Rasff />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}
