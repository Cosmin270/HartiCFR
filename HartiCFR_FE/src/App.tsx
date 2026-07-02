import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";

function App() {

    return (
        <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
    );
}

export default App;