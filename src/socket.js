import { io } from "socket.io-client";
import { BASE_URL } from "./api";
export const socket = io(BASE_URL, {
  autoConnect: false,
  auth: (cb) => {
    // set userId at connect time
    const user = JSON.parse(localStorage.getItem("auth_user") || "null"); // or from context
    cb({ userId: user?.id });
  }
});
