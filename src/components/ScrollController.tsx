import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";

export const ScrollController = () => {
    const { pathname } = useLocation();
    const [scrollY, setScrollY] = useState(0);
    const [docHeight, setDocHeight] = useState(0);

    const update = useCallback(() => {
        setScrollY(window.scrollY);
        setDocHeight(document.documentElement.scrollHeight - window.innerHeight);
    }, []);

    useEffect(() => {
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [update]);

    const atTop = scrollY <= 10;
    const atBottom = docHeight > 0 && scrollY >= docHeight - 10;

    // Hide when page isn't scrollable, and in the rider app, where riders
    // scroll by touch and the buttons would cover the bottom tab bar.
    if (docHeight < 100 || pathname.startsWith("/rider")) return null;

    return (
        <div className="fixed bottom-6 right-5 z-50 flex flex-col gap-1.5">
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                disabled={atTop}
                title="Scroll to top"
                className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 shadow-sm text-neutral-500 hover:text-neutral-800 hover:border-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronUp className="w-4 h-4" />
            </button>
            <button
                onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
                disabled={atBottom}
                title="Scroll to bottom"
                className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 shadow-sm text-neutral-500 hover:text-neutral-800 hover:border-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronDown className="w-4 h-4" />
            </button>
        </div>
    );
};
