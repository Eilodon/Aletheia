
# 🔍 UI/UX Audit chuyên sâu — Aletheia

## A. PERFORMANCE (Hiệu suất)

### 1. ⚠️ Style Recalc quá cao: 12,214 lần, 8.35s
- **Nguyên nhân**: Framer Motion animation liên tục + AmbientParticles canvas + nhiều `animate` properties
- **Đề xuất**: Giảm particle count trên mobile, dùng `will-change` và `transform` thay vì layout-triggering props
- **Tác động**: Tiết kiệm pin, mượt hơn trên thiết bị yếu

### 2. ⚠️ Gateway Reveal plays EVERY app open  
- **Vấn đề**: Memory ghi "Intro plays EVERY app open" — gây phiền khi user quay lại app
- **Đề xuất**: Chỉ show lần đầu (localStorage check), hoặc rút xuống 1.5s cho lần sau
- **Tác động**: Giảm friction đáng kể cho returning users

### 3. ⚠️ FCP 3.5s quá chậm
- **Nguyên nhân**: Gateway Reveal chặn content + lucide-react 158KB (import toàn bộ)
- **Đề xuất**: Tree-shake lucide (chỉ import icon cần), lazy load ReadingScreen

## B. UX FLOW (Trải nghiệm người dùng)

### 4. 🔴 Onboarding: Nút "Tiếp tục" bị ẩn dưới fold
- **Vấn đề**: Screenshot cho thấy phải scroll mới thấy nút Continue — user có thể bị kẹt
- **Đề xuất**: Đảm bảo toàn bộ Step 1 fit trong viewport (giảm padding/spacing)
- **Tác động cao**: First-time user có thể bỏ app ngay lập tức

### 5. 🟡 Reading Phase 1: Textarea quá lớn cho optional input  
- **Vấn đề**: Textarea 4 rows chiếm quá nhiều không gian cho input tùy chọn
- **Đề xuất**: Dùng 2 rows hoặc collapsible input — nhấn mạnh nút "Bỏ qua" rõ hơn
- **Tác động**: Giảm cognitive load, user biết rõ đây là optional

### 6. 🟡 Không có micro-feedback khi chọn card  
- **Vấn đề**: Sau khi chọn card → chỉ thấy "Đang mở lá bài..." rồi chờ ritual
- **Đề xuất**: Thêm haptic feedback + card glow animation ngay khi tap
- **Tác động**: Cảm giác responsive, engaging hơn

### 7. 🟡 Passage screen: Nút "Xin diễn giải" quá nhỏ/mờ
- **Vấn đề**: Nút AI interpretation rất nhỏ (10px), dễ bỏ qua
- **Đề xuất**: Làm nổi bật hơn, có thể thêm subtle pulse animation
- **Tác động**: Tăng AI engagement rate

### 8. 🟢 Home: CTA "Lật một lá" delay 1.5s mới xuất hiện
- **Vấn đề**: User phải chờ animation sequence quá lâu trước khi thấy CTA
- **Đề xuất**: Giảm delay xuống 0.8s, hoặc show skeleton ngay
- **Tác động**: Giảm bounce rate cho returning users

## C. VISUAL / UI

### 9. 🟡 Mirror empty state: Hình ảnh quá abstract
- **Vấn đề**: SVG concentric circles khó hiểu, text nhỏ và mờ
- **Đề xuất**: Thêm illustration rõ ràng hơn hoặc larger text, stronger CTA
- **Tác động**: User hiểu rõ hơn purpose của Mirror

### 10. 🟡 Settings: "Về Aletheia" icon trùng (Info × 2)
- **Vấn đề**: Dùng Info icon cả bên trái lẫn action button bên phải
- **Đề xuất**: Bên phải dùng ChevronRight hoặc Arrow icon
- **Tác động**: Clarity nhỏ nhưng polish hơn

### 11. 🟢 TabBar: Không có label text
- **Vấn đề**: Chỉ có icon, không có text label → accessibility kém
- **Đề xuất**: Thêm tiny label dưới mỗi icon (Home, Gương, Cài đặt)
- **Tác động**: Accessibility + usability cho first-time users

### 12. 🟢 Card text quá nhỏ trên mobile
- **Vấn đề**: Flavor text 7-8px gần như không đọc được trên mobile
- **Đề xuất**: Tăng lên 9-10px, hoặc ẩn flavor text trên mobile nhỏ
- **Tác động**: Readability

## D. ACCESSIBILITY & POLISH

### 13. 🟡 Thiếu skip-to-content cho screen readers
- **Đề xuất**: Thêm skip link ẩn + proper ARIA landmarks

### 14. 🟡 Color contrast: Text muted quá mờ  
- **Vấn đề**: Nhiều text dùng `text-muted-foreground/25` hoặc `/30` — contrast ratio < 3:1
- **Đề xuất**: Tăng minimum opacity lên /40-/50 cho body text

### 15. 🟢 Thiếu loading/error states
- **Đề xuất**: Thêm skeleton loading cho DailyPassage, error boundary UI đẹp hơn

---

## Ưu tiên thực hiện (theo impact):

| Priority | Items | Effort |
|----------|-------|--------|
| **P0** | #4 (CTA bị ẩn), #2 (Gateway repeat) | Nhỏ |
| **P1** | #1 (Performance), #3 (FCP), #8 (CTA delay), #14 (Contrast) | Trung bình |
| **P2** | #5, #6, #7, #11 (UX polish) | Trung bình |
| **P3** | #9, #10, #12, #13, #15 (Nice-to-have) | Nhỏ |
