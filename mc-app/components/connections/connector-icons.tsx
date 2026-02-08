import * as React from "react";
import {
  siGmail,
  siGooglecalendar,
  siNotion,
  siX,
  siXdotorg,
  siGithub,
  siStrava,
  siAnthropic,
} from "simple-icons";

function IconSvg({ path, color }: { path: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill={color}>
      <path d={path} />
    </svg>
  );
}

export function ConnectorIcon({ id }: { id: string }) {
  const map: Record<string, any> = {
    gmail: siGmail,
    google_calendar: siGooglecalendar,
    notion: siNotion,
    x: siXdotorg || siX,
    github: siGithub,
    strava: siStrava,
    // simple-icons doesn't include OpenAI/Slack official marks; we'll use neutral glyphs for now.
    openai: null,
    slack: null,
    anthropic: siAnthropic,
  };

  const si = map[id];
  if (!si) {
    return <div className="h-6 w-6 rounded-md bg-muted" />;
  }

  // simple-icons provides SVG path + hex color
  const color = `#${si.hex}`;
  return <IconSvg path={si.path} color={color} />;
}
