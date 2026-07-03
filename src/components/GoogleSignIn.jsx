import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { authErrorMessage } from "../lib/authMessages";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "546310314961-0n0q18cm0lbm214uc04jqefuithair82.apps.googleusercontent.com";

async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashed = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { nonce, hashed };
}

export default function GoogleSignIn({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    async function renderGoogleButton() {
      if (!GOOGLE_CLIENT_ID || !window.google || !buttonRef.current || !active) {
        if (!GOOGLE_CLIENT_ID && active) setStatus("unavailable");
        return;
      }
      const { nonce, hashed } = await createNonce();
      if (!active || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        callback: async ({ credential }) => {
          setStatus("signing-in");
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
          if (error) {
            setStatus("ready");
            onError?.(authErrorMessage(error));
            return;
          }
          onSuccess?.();
        },
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.min(buttonRef.current.clientWidth || 400, 400),
      });
      setStatus("ready");
    }

    if (window.google) renderGoogleButton();
    else {
      let script = document.querySelector('script[data-mock-exam-google]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.dataset.mockExamGoogle = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderGoogleButton, { once: true });
      script.addEventListener("error", () => active && setStatus("unavailable"), { once: true });
    }
    return () => { active = false; };
  }, [onError, onSuccess]);

  return <div className="google-signin-wrap">
    <div ref={buttonRef} className="google-signin-button" aria-label="เข้าสู่ระบบด้วย Google" />
    {status === "loading" && <span className="auth-inline-status">กำลังเตรียม Google…</span>}
    {status === "signing-in" && <span className="auth-inline-status">กำลังเข้าสู่ระบบ…</span>}
    {status === "unavailable" && <span className="auth-message error">ยังไม่สามารถเปิด Google Sign-In ได้ กรุณาใช้อีเมลแทน</span>}
  </div>;
}
