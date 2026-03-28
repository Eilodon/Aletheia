//! Aletheia Core - Card Generator
//! Generates SVG share cards with tradition-specific ornaments

use crate::contracts::*;
use crate::errors::AletheiaError;

const CARD_WIDTH: u32 = 1080;
const CARD_HEIGHT: u32 = 1920;

pub struct CardGenerator;

impl CardGenerator {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_share_card(&self, card: &ShareCard) -> Result<String, AletheiaError> {
        let truncated_text = Self::truncate_text(&card.passage_text, 120);
        let ornament = Self::get_ornament(card.tradition);
        let date = Self::format_date(card.generated_at);
        
        let watermark = if card.has_watermark {
            "<text x=\"540\" y=\"1850\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"24\" fill=\"#9CA3AF\">aletheia.app</text>".to_string()
        } else {
            String::new()
        };

        let svg = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<svg width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\" xmlns=\"http://www.w3.org/2000/svg\">\n\
  <defs>\n\
    <linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n\
      <stop offset=\"0%\" style=\"stop-color:#1A1A2E\"/>\n\
      <stop offset=\"100%\" style=\"stop-color:#16213E\"/>\n\
    </linearGradient>\n\
  </defs>\n\
  <rect width=\"{w}\" height=\"{h}\" fill=\"url(#bg)\"/>\n\
  <text x=\"540\" y=\"120\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"48\" font-weight=\"bold\" fill=\"#E5E7EB\" letter-spacing=\"8\">✦ ALETHEIA ✦</text>\n\
  <g id=\"ornament\">{ornament}</g>\n\
  <text x=\"540\" y=\"450\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"64\" font-weight=\"600\" fill=\"#FCD34D\">{symbol}</text>\n\
  <rect x=\"100\" y=\"520\" width=\"880\" height=\"2\" fill=\"#374151\"/>\n\
  <text x=\"540\" y=\"600\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"36\" fill=\"#D1D5DB\" font-style=\"italic\">\"{text}\"</text>\n\
  <text x=\"540\" y=\"700\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"28\" fill=\"#9CA3AF\">{ref}</text>\n\
  <rect x=\"100\" y=\"750\" width=\"880\" height=\"1\" fill=\"#374151\" opacity=\"0.5\"/>\n\
  <text x=\"540\" y=\"800\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"32\" fill=\"#9CA3AF\" font-style=\"italic\">Not a fortune. A mirror.</text>\n\
  <text x=\"540\" y=\"1850\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"28\" fill=\"#6B7280\">aletheia.app · {date}</text>\n\
  {watermark}\n\
</svg>",
            w = CARD_WIDTH,
            h = CARD_HEIGHT,
            ornament = ornament,
            symbol = card.symbol.display_name,
            text = truncated_text,
            ref = card.reference,
            date = date,
            watermark = watermark,
        );

        Ok(svg)
    }

    fn truncate_text(text: &str, max_length: usize) -> String {
        if text.len() <= max_length {
            text.to_string()
        } else {
            format!("{}...", &text[..max_length - 3])
        }
    }

    fn format_date(timestamp: i64) -> String {
        let secs = timestamp / 1000;
        let days = secs / 86400;
        let years = 1970 + (days / 365);
        let remaining_days = days % 365;
        let months = (remaining_days / 30) + 1;
        let day = (remaining_days % 30) + 1;

        let month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let month_name = month_names.get((months - 1) as usize).unwrap_or(&"Jan");

        format!("{} {}, {}", day, month_name, years)
    }

    fn get_ornament(tradition: Tradition) -> String {
        match tradition {
            Tradition::Chinese => "<circle cx=\"540\" cy=\"300\" r=\"80\" fill=\"none\" stroke=\"#C41E3A\" stroke-width=\"3\"/><path d=\"M540 220 L540 180 M540 420 L540 380 M460 300 L420 300 M620 300 L660 300\" stroke=\"#C41E3A\" stroke-width=\"3\"/>".to_string(),
            Tradition::Christian => "<path d=\"M540 200 L540 400 M480 250 L540 200 L600 250\" fill=\"none\" stroke=\"#2F4F4F\" stroke-width=\"4\"/>".to_string(),
            Tradition::Islamic => "<circle cx=\"540\" cy=\"300\" r=\"70\" fill=\"none\" stroke=\"#1E3A5F\" stroke-width=\"2\"/><circle cx=\"540\" cy=\"300\" r=\"50\" fill=\"none\" stroke=\"#1E3A5F\" stroke-width=\"1.5\"/>".to_string(),
            Tradition::Sufi => "<polygon points=\"540,220 580,300 540,380 500,300\" fill=\"none\" stroke=\"#800020\" stroke-width=\"2\"/>".to_string(),
            Tradition::Stoic => "<path d=\"M480 250 Q540 200 600 250\" fill=\"none\" stroke=\"#4A5568\" stroke-width=\"3\"/><path d=\"M480 350 Q540 400 600 350\" fill=\"none\" stroke=\"#4A5568\" stroke-width=\"3\"/>".to_string(),
            Tradition::Universal => "<circle cx=\"540\" cy=\"300\" r=\"60\" fill=\"none\" stroke=\"#6B7280\" stroke-width=\"2\"/><circle cx=\"540\" cy=\"300\" r=\"40\" fill=\"none\" stroke=\"#6B7280\" stroke-width=\"1.5\"/><circle cx=\"540\" cy=\"300\" r=\"20\" fill=\"none\" stroke=\"#6B7280\" stroke-width=\"1\"/>".to_string(),
        }
    }
}

impl Default for CardGenerator {
    fn default() -> Self {
        Self::new()
    }
}
