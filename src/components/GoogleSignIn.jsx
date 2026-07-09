import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { authErrorMessage } from "../lib/authMessages";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "546310314961-0n0q18cm0lbm214uc04jqefuithair82.apps.googleusercontent.com";
let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-mock-exam-google]');
    const done = () => window.google?.accounts?.id ? resolve(window.google) : reject(new Error("Google Sign-In ยังไม่พร้อมใช้งาน"));
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.mockExamGoogle = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("โหลด Google Sign-In ไม่สำเร็จ")), { once: true });
    if (script.dataset.loaded === "true" || window.google?.accounts?.id) done();
    else script.addEventListener("load", () => { script.dataset.loaded = "true"; }, { once: true });
  });
  return googleScriptPromise;
}

async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashed = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { nonce, hashed };
}

export default function GoogleSignIn({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const signingInRef = useRef(false);
  const lastButtonWidthRef = useRef(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    let resizeObserver;

    async function renderGoogleButton() {
      if (!GOOGLE_CLIENT_ID || !buttonRef.current || !active) {
        if (!GOOGLE_CLIENT_ID && active) setStatus("unavailable");
        return;
      }
      try {
        const google = await loadGoogleScript();
        const { nonce, hashed } = await createNonce();
        if (!active || !buttonRef.current) return;
        lastButtonWidthRef.current = buttonRef.current.clientWidth || lastButtonWidthRef.current;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            if (!credential || signingInRef.current) return;
            signingInRef.current = true;
            setStatus("signing-in");
            const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
            signingInRef.current = false;
            if (error) {
              setStatus("ready");
              onError?.(authErrorMessage(error));
              return;
            }
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              setStatus("ready");
              onError?.("เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง");
              return;
            }
            onSuccess?.();
          },
        });
        buttonRef.current.replaceChildren();
        google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(220, Math.min(buttonRef.current.clientWidth || 360, 400)),
        });
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setStatus("unavailable");
        onError?.(error.message || "Google Sign-In ยังไม่พร้อมใช้งาน กรุณาใช้อีเมลแทน");
      }
    }

    renderGoogleButton();
    if (buttonRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        const width = buttonRef.current?.clientWidth || 0;
        if (width && Math.abs(width - lastButtonWidthRef.current) > 16 && !signingInRef.current) renderGoogleButton();
      });
      resizeObserver.observe(buttonRef.current);
    }
    return () => {
      active = false;
      resizeObserver?.disconnect();
    };
  }, [onError, onSuccess]);

  return <div className="google-signin-wrap">
    <div ref={buttonRef} className="google-signin-button" aria-label="เข้าสู่ระบบด้วย Google" />
    {status === "loading" && <span className="auth-inline-status">กำลังเตรียม Google…</span>}
    {status === "signing-in" && <span className="auth-inline-status">กำลังเข้าสู่ระบบ…</span>}
    {status === "unavailable" && <span className="auth-message error">ยังไม่สามารถเปิด Google Sign-In ได้ กรุณาใช้อีเมลแทน</span>}
  </div>;
}
