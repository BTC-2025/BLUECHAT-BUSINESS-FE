/**
 * Web Crypto API Utils for RSA/AES Hybrid Encryption
 */

// ✅ Generate RSA key pair (OAEP for encryption)
export async function generateKeyPair() {
    const pair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
    return pair;
}

// ✅ Export key to base64 string
export async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey(
        key.type === "public" ? "spki" : "pkcs8",
        key
    );
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// ✅ Import key from base64 string
export async function importKey(b64, type) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return await window.crypto.subtle.importKey(
        type === "public" ? "spki" : "pkcs8",
        bytes.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        type === "public" ? ["encrypt"] : ["decrypt"]
    );
}

// ✅ Encrypt message using hybrid RSA/AES-GCM for multiple recipients
export async function encryptMessage(text, publicKeysMap) {
    // 1. Generate random AES-256 key
    const aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // 2. Encrypt body with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedBody = new TextEncoder().encode(text);
    const encryptedBodyBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encodedBody
    );

    // 3. Encrypt AES key with each recipient's RSA Public Key
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedKeys = await Promise.all(
        Object.entries(publicKeysMap).map(async ([userId, pubKeyB64]) => {
            const publicKey = await importKey(pubKeyB64, "public");
            const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                publicKey,
                exportedAesKey
            );
            return {
                user: userId,
                key: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBuffer)))
            };
        })
    );

    // Combine IV and Encrypted Body for convenience
    const combined = new Uint8Array(iv.length + encryptedBodyBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBodyBuffer), iv.length);

    return {
        encryptedBody: btoa(String.fromCharCode(...combined)),
        encryptedKeys
    };
}

// ✅ Decrypt message using stored RSA Private Key
export async function decryptMessage(encryptedBodyB64, encryptedKeyB64, privateKey) {
    try {
        const encryptedKeyBinary = atob(encryptedKeyB64);
        const encryptedKeyBytes = new Uint8Array(encryptedKeyBinary.length);
        for (let i = 0; i < encryptedKeyBinary.length; i++) encryptedKeyBytes[i] = encryptedKeyBinary.charCodeAt(i);

        // 1. Decrypt AES key with RSA Private Key
        const aesKeyBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedKeyBytes.buffer
        );

        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            "AES-GCM",
            true,
            ["decrypt"]
        );

        // 2. Decrypt body with AES-GCM
        const combined = atob(encryptedBodyB64);
        const combinedBytes = new Uint8Array(combined.length);
        for (let i = 0; i < combined.length; i++) combinedBytes[i] = combined.charCodeAt(i);

        const iv = combinedBytes.slice(0, 12);
        const encryptedBody = combinedBytes.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encryptedBody.buffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.error("Decryption failed:", err);
        return "[Encrypted Message]";
    }
}
