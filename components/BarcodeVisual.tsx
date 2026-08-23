'use client';

import React, { useId, useMemo } from 'react';
import bwipjs from 'bwip-js';

interface BarcodeVisualProps {
  value: string;
  className?: string;
  height?: number;
  showText?: boolean;
  bcid?: string;
}

/**
 * Barcode component powered by bwip-js for authentic, scannable barcode generation.
 */
export default function BarcodeVisual({
  value,
  className = '',
  height = 14,
  showText = true,
  bcid = 'code128',
}: BarcodeVisualProps) {
  const elementId = useId();

  const rawText = (value || '').trim();
  const textToEncode = rawText || '00000000';
  const barHeightMm = height > 30 ? Math.max(10, Math.round(height / 3.5)) : Math.max(8, height);

  const svgMarkup = useMemo(() => {
    try {
      return bwipjs.toSVG({
        bcid: bcid,
        text: textToEncode,
        scale: 2,
        height: barHeightMm,
        includetext: showText,
        textxalign: 'center',
        textsize: 9,
        paddingwidth: 4,
        paddingheight: 4,
        backgroundcolor: 'ffffff',
      });
    } catch {
      try {
        const sanitized = textToEncode.replace(/[^\x20-\x7E]/g, '') || '00000000';
        return bwipjs.toSVG({
          bcid: 'code128',
          text: sanitized,
          scale: 2,
          height: barHeightMm,
          includetext: showText,
          textxalign: 'center',
          textsize: 9,
          paddingwidth: 4,
          paddingheight: 4,
          backgroundcolor: 'ffffff',
        });
      } catch {
        return null;
      }
    }
  }, [textToEncode, barHeightMm, showText, bcid]);

  if (!svgMarkup) {
    return (
      <div
        id={`barcode-visual-${elementId}`}
        className={`flex flex-col items-center justify-center p-2 text-center text-xs text-text-muted font-mono bg-surface-subtle border border-subtle rounded ${className}`}
      >
        <span>{textToEncode}</span>
        <span className="block text-[10px] text-danger mt-0.5">Invalid Barcode Format</span>
      </div>
    );
  }

  return (
    <div
      id={`barcode-visual-${elementId}`}
      className={`flex flex-col items-center justify-center select-none ${className}`}
    >
      <div
        className="max-w-full overflow-hidden rounded bg-white [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-[280px]"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}
