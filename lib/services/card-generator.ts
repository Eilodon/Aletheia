/**
 * CardGenerator Service - SVG to PNG Share Card
 * Handles: generate_share_card with tradition-specific ornaments
 */

import * as Svg from "react-native-svg";
import { ShareCard as ShareCardType, Tradition } from "@/lib/types";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const ORNAMENTS: Record<Tradition, string> = {
  [Tradition.Chinese]: `<circle cx="540" cy="300" r="80" fill="none" stroke="#C41E3A" stroke-width="3"/>
<path d="M540 220 L540 180 M540 420 L540 380 M460 300 L420 300 M620 300 L660 300" stroke="#C41E3A" stroke-width="3"/>
<circle cx="540" cy="300" r="60" fill="none" stroke="#C41E3A" stroke-width="2"/>`,
  [Tradition.Christian]: `<path d="M540 200 L540 400 M480 250 L540 200 L600 250" stroke="#2F4F4F" stroke-width="4" fill="none"/>
<circle cx="540" cy="280" r="15" fill="#2F4F4F"/>`,
  [Tradition.Islamic]: `<circle cx="540" cy="300" r="70" fill="none" stroke="#1E3A5F" stroke-width="2"/>
<circle cx="540" cy="300" r="50" fill="none" stroke="#1E3A5F" stroke-width="1.5"/>
<circle cx="540" cy="300" r="30" fill="none" stroke="#1E3A5F" stroke-width="1"/>
<path d="M540 230 L540 240 M540 360 L540 370 M470 300 L480 300 M600 300 L610 300" stroke="#1E3A5F" stroke-width="1.5"/>`,
  [Tradition.Sufi]: `<polygon points="540,220 580,300 540,380 500,300" fill="none" stroke="#800020" stroke-width="2"/>
<polygon points="540,260 560,300 540,340 520,300" fill="none" stroke="#800020" stroke-width="1.5"/>
<circle cx="540" cy="300" r="20" fill="none" stroke="#800020" stroke-width="1"/>`,
  [Tradition.Stoic]: `<path d="M480 250 Q540 200 600 250" fill="none" stroke="#4A5568" stroke-width="3"/>
<path d="M480 350 Q540 400 600 350" fill="none" stroke="#4A5568" stroke-width="3"/>
<circle cx="540" cy="300" r="25" fill="none" stroke="#4A5568" stroke-width="2"/>`,
  [Tradition.Universal]: `<circle cx="540" cy="300" r="60" fill="none" stroke="#6B7280" stroke-width="2"/>
<circle cx="540" cy="300" r="40" fill="none" stroke="#6B7280" stroke-width="1.5"/>
<circle cx="540" cy="300" r="20" fill="none" stroke="#6B7280" stroke-width="1"/>
<circle cx="540" cy="220" r="5" fill="#6B7280"/>
<circle cx="540" cy="380" r="5" fill="#6B7280"/>
<circle cx="460" cy="300" r="5" fill="#6B7280"/>
<circle cx="620" cy="300" r="5" fill="#6B7280"/>`,
};

const WATERMARK_SVG = `<text x="540" y="1850" text-anchor="middle" font-family="system-ui" font-size="24" fill="#9CA3AF">aletheia.app</text>`;

const BASE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A1A2E"/>
      <stop offset="100%" style="stop-color:#16213E"/>
    </linearGradient>
  </defs>
  
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  
  <text x="540" y="120" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="#E5E7EB" letter-spacing="8">✦ ALETHEIA ✦</text>
  
  <g id="ornament">{ornament}</g>
  
  <text x="540" y="450" text-anchor="middle" font-family="system-ui" font-size="64" font-weight="600" fill="#FCD34D">{symbol_name}</text>
  
  <rect x="100" y="520" width="880" height="2" fill="#374151"/>
  
  <text x="540" y="600" text-anchor="middle" font-family="system-ui" font-size="36" fill="#D1D5DB" font-style="italic">"{passage_text}"</text>
  
  <text x="540" y="700" text-anchor="middle" font-family="system-ui" font-size="28" fill="#9CA3AF">{reference}</text>
  
  <rect x="100" y="750" width="880" height="1" fill="#374151" opacity="0.5"/>
  
  <text x="540" y="800" text-anchor="middle" font-family="system-ui" font-size="32" fill="#9CA3AF" font-style="italic">Not a fortune. A mirror.</text>
  
  <text x="540" y="1850" text-anchor="middle" font-family="system-ui" font-size="28" fill="#6B7280">aletheia.app · {date}</text>
  
  {watermark}
</svg>`;

class CardGeneratorService {
  async generateShareCard(card: ShareCardType): Promise<{ imageData: string; width: number; height: number }> {
    const truncatedText = this.truncateText(card.passage_text, 120);
    const ornament = ORNAMENTS[card.tradition] || ORNAMENTS[Tradition.Universal];
    const date = this.formatDate(card.generated_at);
    const watermark = card.has_watermark ? WATERMARK_SVG : "";

    const svgContent = BASE_SVG
      .replace("{ornament}", ornament)
      .replace("{symbol_name}", card.symbol.display_name)
      .replace("{passage_text}", truncatedText)
      .replace("{reference}", card.reference)
      .replace("{date}", date)
      .replace("{watermark}", watermark);

    const svgBase64 = this.svgToBase64(svgContent);

    return {
      imageData: svgBase64,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + "...";
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.toLocaleString("vi-VN", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  }

  private svgToBase64(svgContent: string): string {
    const encoded = encodeURIComponent(svgContent);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }
}

export const cardGenerator = new CardGeneratorService();
