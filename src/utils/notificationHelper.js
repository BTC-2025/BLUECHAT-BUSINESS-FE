// client/src/utils/notificationHelper.js
import axios from "axios";
import { API_BASE } from "../api";

const VAPID_PUBLIC_KEY = "BERh9iQ2e_srICeq36d_-Q_SJ2jvVaBvshYn_zOyPSJBtIMh36qTgJVH_ah-gw8hof8IJjStMULpR9pGauZN_ew";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const requestNotificationPermission = async (userToken) => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        console.warn("Notifications not supported");
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                // Save to backend
                await axios.post(`${API_BASE}/notifications/subscribe`, subscription, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
            }
            return true;
        }
        return false;
    } catch (err) {
        console.error("Failed to subscribe to push notifications", err);
        return false;
    }
};

export const unsubscribeFromNotifications = async (userToken) => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            await axios.post(`${API_BASE}/notifications/unsubscribe`, subscription, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
        }
    } catch (err) {
        console.error("Failed to unsubscribe", err);
    }
};

export const playNotificationSound = () => {
    console.log("🔔 Attempting to play notification sound...");
    const audio = new Audio("/notification-3.mp3");
    audio.play()
        .then(() => console.log("🔊 Notification sound played successfully"))
        .catch(err => {
            console.error("❌ Failed to play notification sound:", err.message);
            console.log("💡 Tip: Most browsers require a user interaction (click/tap) before playing sound.");
        });
};

let ringtoneAudio = null;

export const playRingtone = () => {
    if (ringtoneAudio) return;

    console.log("☎️ Playing ringtone...");
    ringtoneAudio = new Audio("/ringtone.mp3");
    ringtoneAudio.loop = true;
    ringtoneAudio.play().catch(err => {
        console.error("❌ Failed to play ringtone:", err.message);
    });
};

export const stopRingtone = () => {
    if (ringtoneAudio) {
        console.log("📵 Stopping ringtone...");
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio.remove();
        ringtoneAudio = null;
    }
};
