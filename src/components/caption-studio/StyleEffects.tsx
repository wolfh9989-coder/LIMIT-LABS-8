"use client";

import type { CSSProperties } from "react";
import type { CaptionDecoration } from "@/lib/caption/types";

type CaptionDecorationLayerProps = {
  decoration?: CaptionDecoration;
  animated?: boolean;
  density?: number;
  speed?: number;
};

export function CaptionDecorationLayer({
  decoration,
  animated = true,
  density = 1,
  speed = 1,
}: CaptionDecorationLayerProps) {
  if (!decoration || decoration.type === "none") {
    return null;
  }

  const isAnimated = decoration.animated && animated;
  const motionStyle = isAnimated ? motionToStyle(decoration.motion, speed) : undefined;
  const alpha = clamp(decoration.opacity, 0, 1);
  const strength = clamp(decoration.intensity * density, 0.2, 1.6);
  const accentA = decoration.accentA ?? "#22D3EE";
  const accentB = decoration.accentB ?? "#A855F7";
  const accentC = decoration.accentC ?? "#F472B6";

  const shell: CSSProperties = {
    opacity: alpha,
    ...motionStyle,
  };

  switch (decoration.type) {
    case "retroDisco":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" style={shell}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${hexWithAlpha(accentA, 0.26)}, ${hexWithAlpha(accentB, 0.16)}, ${hexWithAlpha(accentC, 0.22)})`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${hexWithAlpha("#FFFFFF", 0.45)} 1px, transparent 1.8px)`,
              backgroundSize: `${Math.max(11, 16 / strength)}px ${Math.max(11, 16 / strength)}px`,
            }}
          />
        </div>
      );

    case "comicBubble":
      return <div className="pointer-events-none absolute inset-0 rounded-[999px] border-[4px] border-black bg-white/90" style={shell} />;

    case "comicThought":
      return (
        <div className="pointer-events-none absolute inset-0" style={shell}>
          <div className="absolute inset-0 rounded-[999px] border-[4px] border-black bg-white/95" />
          <div className="absolute -bottom-3 left-8 h-4 w-4 rounded-full border-[3px] border-black bg-white" />
          <div className="absolute -bottom-7 left-4 h-3 w-3 rounded-full border-[3px] border-black bg-white" />
        </div>
      );

    case "comicPunch":
      return (
        <div
          className="pointer-events-none absolute inset-0 border-[4px] border-black"
          style={{
            ...shell,
            backgroundColor: accentB,
            clipPath:
              "polygon(50% 0%,62% 22%,85% 8%,76% 32%,100% 28%,82% 48%,100% 60%,74% 62%,84% 90%,58% 76%,50% 100%,40% 78%,12% 92%,22% 62%,0% 60%,18% 48%,0% 28%,24% 32%,14% 8%,38% 22%)",
          }}
        />
      );

    case "comicShatter":
      return (
        <div
          className="pointer-events-none absolute inset-0 border-[4px] border-black"
          style={{
            ...shell,
            backgroundColor: accentA,
            clipPath:
              "polygon(50% 2%,58% 18%,78% 10%,70% 30%,96% 30%,78% 46%,98% 56%,74% 62%,80% 88%,58% 76%,50% 98%,42% 76%,20% 90%,26% 62%,2% 56%,22% 46%,4% 30%,30% 30%,22% 10%,42% 18%)",
          }}
        />
      );

    case "comicZap":
      return (
        <div className="pointer-events-none absolute inset-0" style={shell}>
          <div
            className="absolute left-1/2 top-1/2 h-[88%] w-[60%] -translate-x-1/2 -translate-y-1/2 blur-[1px]"
            style={{
              clipPath:
                "polygon(22% 0%,58% 0%,42% 28%,74% 28%,34% 100%,48% 58%,20% 58%)",
              backgroundColor: hexWithAlpha(accentA, 0.35),
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[86%] w-[58%] -translate-x-1/2 -translate-y-1/2"
            style={{
              clipPath:
                "polygon(22% 0%,58% 0%,42% 28%,74% 28%,34% 100%,48% 58%,20% 58%)",
              backgroundColor: hexWithAlpha(accentB, 0.85),
              boxShadow: `0 0 16px ${hexWithAlpha(accentC, 0.35)}`,
            }}
          />
        </div>
      );

    case "metallicPanel":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20"
          style={{
            ...shell,
            background: `linear-gradient(135deg, ${hexWithAlpha("#FFFFFF", 0.28)}, ${hexWithAlpha(accentA, 0.2)}, ${hexWithAlpha("#1E293B", 0.45)}, ${hexWithAlpha("#FFFFFF", 0.14)})`,
            boxShadow: `inset 0 1px 0 ${hexWithAlpha("#FFFFFF", 0.35)}`,
          }}
        />
      );

    case "particles":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" style={shell}>
          {Array.from({ length: Math.round(8 + 12 * strength) }).map((_, index) => (
            <span
              key={index}
              className="absolute rounded-full blur-[1px]"
              style={{
                width: `${4 + (index % 4)}px`,
                height: `${4 + (index % 4)}px`,
                left: `${(index * 7) % 100}%`,
                top: `${(index * 13) % 100}%`,
                backgroundColor: index % 2 === 0 ? hexWithAlpha(accentA, 0.75) : hexWithAlpha(accentB, 0.75),
                opacity: 0.2 + (index % 4) * 0.12,
              }}
            />
          ))}
        </div>
      );

    case "pixelFrame":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] bg-black/45"
          style={{ ...shell, borderColor: hexWithAlpha(accentA, 0.9), imageRendering: "pixelated" }}
        />
      );

    case "hearts":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" style={shell}>
          {Array.from({ length: Math.round(6 + 6 * strength) }).map((_, index) => (
            <span
              key={index}
              className="absolute"
              style={{
                color: hexWithAlpha(accentA, 0.82),
                left: `${10 + index * 10}%`,
                top: `${60 - (index % 3) * 16}%`,
                fontSize: `${10 + (index % 4) * 4}px`,
              }}
            >
              ♥
            </span>
          ))}
        </div>
      );

    case "stars":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" style={shell}>
          {Array.from({ length: Math.round(8 + 8 * strength) }).map((_, index) => (
            <span
              key={index}
              className="absolute"
              style={{
                color: hexWithAlpha(accentB, 0.78),
                left: `${8 + index * 8}%`,
                top: `${12 + (index % 4) * 18}%`,
                fontSize: `${8 + (index % 3) * 5}px`,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      );

    case "lightning":
      return (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={shell}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${hexWithAlpha(accentA, 0.15)}, ${hexWithAlpha(accentB, 0.16)})`,
            }}
          />
          <div className="absolute left-3 top-1 h-[85%] w-[2px] rotate-[18deg]" style={{ backgroundColor: hexWithAlpha(accentA, 0.85) }} />
          <div className="absolute right-6 top-2 h-[70%] w-[2px] -rotate-[12deg]" style={{ backgroundColor: hexWithAlpha(accentB, 0.78) }} />
        </div>
      );

    case "smoke":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" style={shell}>
          <div className="absolute -bottom-3 left-0 h-10 w-20 rounded-full blur-xl" style={{ backgroundColor: hexWithAlpha(accentA, 0.2) }} />
          <div className="absolute -bottom-2 right-2 h-12 w-24 rounded-full blur-xl" style={{ backgroundColor: hexWithAlpha(accentB, 0.2) }} />
        </div>
      );

    case "glitchBars":
      return (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={shell}>
          <div className="absolute inset-x-0 top-2 h-[2px]" style={{ backgroundColor: hexWithAlpha(accentA, 0.8) }} />
          <div className="absolute inset-x-4 top-5 h-[2px]" style={{ backgroundColor: hexWithAlpha(accentB, 0.76) }} />
          <div className="absolute inset-x-2 bottom-4 h-[2px]" style={{ backgroundColor: hexWithAlpha("#FFFFFF", 0.45) }} />
        </div>
      );

    case "chromeGlow":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            ...shell,
            background: `linear-gradient(135deg, ${hexWithAlpha("#FFFFFF", 0.28)}, ${hexWithAlpha(accentA, 0.12)}, ${hexWithAlpha("#FFFFFF", 0.18)})`,
            boxShadow: `0 0 16px ${hexWithAlpha("#FFFFFF", 0.2)}`,
          }}
        />
      );

    case "graffitiSpray":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            ...shell,
            background: `radial-gradient(circle at 20% 30%, ${hexWithAlpha(accentA, 0.26)}, transparent 20%), radial-gradient(circle at 70% 60%, ${hexWithAlpha(accentB, 0.24)}, transparent 22%), radial-gradient(circle at 85% 20%, ${hexWithAlpha(accentC, 0.26)}, transparent 18%)`,
          }}
        />
      );

    case "horrorDrip":
      return (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={shell}>
          <div className="absolute inset-x-0 top-0 h-3" style={{ backgroundColor: hexWithAlpha(accentA, 0.65) }} />
          <div className="absolute left-4 top-2 h-5 w-2 rounded-b-full" style={{ backgroundColor: hexWithAlpha(accentA, 0.72) }} />
          <div className="absolute left-10 top-2 h-8 w-2 rounded-b-full" style={{ backgroundColor: hexWithAlpha(accentA, 0.68) }} />
          <div className="absolute right-8 top-2 h-6 w-2 rounded-b-full" style={{ backgroundColor: hexWithAlpha(accentA, 0.75) }} />
        </div>
      );

    case "luxuryShimmer":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            ...shell,
            background: `linear-gradient(120deg, ${hexWithAlpha(accentA, 0.15)}, ${hexWithAlpha("#FFFFFF", 0.14)}, ${hexWithAlpha(accentB, 0.13)})`,
          }}
        />
      );

    case "bubblePop":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[999px] border-[3px]"
          style={{
            ...shell,
            backgroundColor: hexWithAlpha(accentA, 0.2),
            borderColor: hexWithAlpha(accentB, 0.65),
            boxShadow: `0 0 18px ${hexWithAlpha(accentC, 0.26)}`,
          }}
        />
      );

    case "handDrawnStroke":
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-dashed"
          style={{ ...shell, borderColor: hexWithAlpha(accentA, 0.52) }}
        />
      );

    default:
      return null;
  }
}

function motionToStyle(motion: CaptionDecoration["motion"], speed: number): CSSProperties {
  const clampedSpeed = clamp(speed, 0.4, 2);
  const d = (base: number) => `${(base / clampedSpeed).toFixed(2)}s`;

  switch (motion) {
    case "float":
      return { animation: `ll8Float ${d(4)} ease-in-out infinite` };
    case "pulse":
      return { animation: `ll8Pulse ${d(1.9)} ease-in-out infinite` };
    case "spark":
      return { animation: `ll8Spark ${d(1.1)} ease-in-out infinite` };
    case "drift":
      return { animation: `ll8Drift ${d(6)} linear infinite` };
    case "flicker":
      return { animation: `ll8Flicker ${d(0.8)} linear infinite` };
    case "pop":
      return { animation: `ll8Pop ${d(1.35)} ease-in-out infinite` };
    case "shake":
      return { animation: `ll8Shake ${d(0.9)} ease-in-out infinite` };
    default:
      return {};
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexWithAlpha(color: string, opacity: number) {
  const value = color.trim();
  const alphaHex = Math.round(clamp(opacity, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return `${value}${alphaHex}`;
  }

  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return `${value.slice(0, 7)}${alphaHex}`;
  }

  return value;
}
