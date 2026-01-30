import { createContext, useContext, useState, useEffect } from "react";
import { api, setAuth } from "../api";
import { socket } from "../socket";
import { generateKeyPair, exportKey } from "../utils/cryptoUtils";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Simple IndexedDB helper for Private Key storage
const DB_NAME = "OfficeChatCrypto";
const STORE_NAME = "keys";

const getPrivateKey = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get("privateKey");
            getReq.onsuccess = () => resolve(getReq.result);
        };
    });
};

const savePrivateKey = (key) => {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.put(key, "privateKey");
            tx.oncomplete = () => resolve();
        };
    });
};

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(() =>
        JSON.parse(localStorage.getItem("auth_user") || "null")
    );
    const [privateKey, setPrivateKey] = useState(null);
    const [loading, setLoading] = useState(true);

    // Reapply token and load Private Key on app start
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("auth_token");
            if (token) {
                setAuth(token);
                // Validate token / Refresh user data
                try {
                    const { data } = await api.get("/auth/me");
                    setUser({ ...data, token });

                    // Load Private Key
                    const key = await getPrivateKey();
                    if (key) setPrivateKey(key);
                } catch (e) {
                    console.error("Token invalid or expired", e);
                    logout();
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    const login = async (phone, password) => {
        const { data } = await api.post("/auth/login", {
            phone,
            password,
            appName: localStorage.getItem('appName') || "Business Client",
            appOrigin: localStorage.getItem('appOrigin') || "business-client"
        });
        setAuth(data.token);
        setUser(data);
        localStorage.setItem("auth_user", JSON.stringify(data));
        localStorage.setItem("auth_token", data.token);

        if (data.publicKey) {
            const key = await getPrivateKey();
            if (key) {
                setPrivateKey(key);
            } else {
                console.warn("Missing private key for encrypted account!");
            }
        }

        return data;
    };

    const register = async (phone, full_name, password, avatar = "") => {
        // 1. Generate E2EE Keys
        const keyPair = await generateKeyPair();
        const pubKeyB64 = await exportKey(keyPair.publicKey);

        // 2. Register with Public Key
        const { data } = await api.post("/auth/register", {
            phone,
            full_name,
            password,
            avatar,
            publicKey: pubKeyB64,
            appName: localStorage.getItem('appName') || "Business Client",
            appOrigin: localStorage.getItem('appOrigin') || "business-client"
        });

        // 3. Save Private Key locally
        await savePrivateKey(keyPair.privateKey);
        setPrivateKey(keyPair.privateKey);

        setAuth(data.token);
        setUser(data);
        localStorage.setItem("auth_user", JSON.stringify(data));
        localStorage.setItem("auth_token", data.token);

        return data;
    };

    const logout = () => {
        setUser(null);
        setPrivateKey(null);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
    };

    const refreshUser = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            const { data } = await api.get("/auth/me");
            const updatedUser = { ...data, token };
            setUser(updatedUser);
            localStorage.setItem("auth_user", JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            console.error("Refresh user error:", error);
        }
    };

    return (
        <AuthCtx.Provider value={{ user, privateKey, login, register, logout, refreshUser, loading }}>
            {!loading && children}
        </AuthCtx.Provider>
    );
}
