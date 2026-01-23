import { useAuth } from "../context/AuthContext";
import RegistrationForm from "../components/RegistrationForm";
import DashboardContent from "../components/DashboardContent";
import { useState } from "react";

export default function BusinessDashboard() {
    const { user } = useAuth();
    const [justRegistered, setJustRegistered] = useState(false);

    // If user just registered, we force show dashboard content which will show pending state
    // ideally user object should be updated via refreshUser in context

    if (!user) return null; // Should be handled by protected route

    if (user.isBusiness || justRegistered) {
        return <DashboardContent />;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4">
            <div className="max-w-4xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-extrabold text-blue-900">Welcome to BlueChat Business</h1>
                <p className="text-gray-600 mt-2">Register your business to start showcasing products and managing your presence.</p>
            </div>
            <RegistrationForm onSuccess={() => setJustRegistered(true)} />
        </div>
    );
}
