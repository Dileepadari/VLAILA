/**
 * Site-wide loader for the VLAILA widget.
 *
 * The widget is the real shipping bundle from `embed/`, not a mock of it, and
 * it decides for itself what it should be: on an experiment page it finds the
 * page's metadata and boots as a lab assistant; anywhere else it boots as a
 * navigator. So the host's only job is to load it once and tell it when the
 * route changed.
 *
 * That last part matters here and nowhere else. Real Virtual Labs pages are
 * static documents, so every navigation reloads the script. This console is a
 * single-page app, where the URL changes under a widget that has already
 * booted -- without the nudge below it would keep describing the first page
 * the user landed on.
 */

import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "vlaila-script";

type VlailaGlobal = { refresh?: () => void };

export function useVlaila() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "/vlaila.js";
    script.dataset.vlailaApi = import.meta.env?.VITE_VLAILA_API ?? "http://localhost:8000";
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    // The widget may still be loading on the first route; it reads the page
    // itself on boot, so missing this call is harmless.
    const w = window as unknown as { __vlaila?: VlailaGlobal };
    w.__vlaila?.refresh?.();
  }, [pathname]);
}
