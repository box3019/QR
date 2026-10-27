// Assistant avatar: QR's own SVG copy of MRT's cartoon face (blinks, looks around; no shared code).
import React, { useId } from 'react';

export function AssistantFace() {
  const clip = 'qr-face-' + useId().replace(/:/g, '');
  return <svg className="qr-face" viewBox="0 0 64 64" aria-hidden>
    <defs><clipPath id={clip}><circle cx="32" cy="32" r="31" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      <circle className="qr-face-disc" cx="32" cy="32" r="31" />
      <g className="qr-face-bob">
        <path className="qr-face-shirt" d="M14 50c5-9 11-13 18-13s13 4 18 13v18H14z" />
        <path className="qr-face-band" d="M16 30c1-13 8-20 16-20s15 7 16 20" />
        <ellipse className="qr-face-cup" cx="15.5" cy="34" rx="5.2" ry="6.2" />
        <ellipse className="qr-face-cup" cx="48.5" cy="34" rx="5.2" ry="6.2" />
        <ellipse className="qr-face-skin" cx="32" cy="36" rx="15" ry="15.5" />
        <ellipse className="qr-face-blush" cx="22.2" cy="41.5" rx="2.4" ry="1.4" />
        <ellipse className="qr-face-blush" cx="41.8" cy="41.5" rx="2.4" ry="1.4" />
        <path className="qr-face-hair" d="M16 33c0-16 7-24 16-24s16 8 16 24c-1-9-7-15-16-15s-15 6-16 15z" />
        <path className="qr-face-hair" d="M18 32c1-8 6-13 12-14 2 3 5 5 8 5 2-3 6-5 10-4 1 4 1 8 0 12-3-4-7-6-11-5-3 1-6 0-9 2-4-1-7-1-10 4z" />
        <path className="qr-face-tuft" d="M36 11c2-6 8-7 11-2-3 1-7 2-11 2z" />
        <g className="qr-face-look"><g className="qr-face-eyes">
          <ellipse className="qr-face-eye" cx="26" cy="36" rx="3.3" ry="4.1" />
          <ellipse className="qr-face-eye" cx="38" cy="36" rx="3.3" ry="4.1" />
          <ellipse className="qr-face-glint" cx="27.1" cy="34.6" rx="1.05" ry="1.25" />
          <ellipse className="qr-face-glint" cx="39.1" cy="34.6" rx="1.05" ry="1.25" />
        </g></g>
        <path className="qr-face-mouth" d="M28.2 44.2c1.3 1.5 2.6 2.1 3.8 2.1s2.5-.6 3.8-2.1" />
      </g>
    </g>
  </svg>;
}
