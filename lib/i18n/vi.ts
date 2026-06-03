/**
 * Vietnamese strings — source of truth for i18n.
 * All other locales must match the shape of this object exactly.
 */
export const vi = {
  common: {
    loading: "Đang tải...",
    error: "Đã có lỗi xảy ra",
    retry: "Thử lại",
    cancel: "Hủy",
    skip: "Bỏ qua",
    share: "Chia sẻ",
  },

  onboarding: {
    skipLabel: "Bỏ qua",
    stepOf: (step: number, total: number) => `Bước ${step} / ${total}`,
    continueLabel: "Tiếp tục",
    enterLabel: "Bước vào →",
    enteringLabel: "Đang mở cổng...",

    welcome: {
      kicker: "not a fortune • a mirror",
      title: "ALETHEIA",
      tagline: "Dừng lại. Phản chiếu. Hiểu.",
      body: "Aletheia không nói trước tương lai. Nó tạo ra một không gian tối, chậm và đủ yên để bạn nhìn lại chính mình qua các đoạn trích triết học.",
    },

    intent: {
      title: "Hôm nay bạn cần chiếc gương nào?",
      body: "Chọn một ý định mở đầu. Nó giúp Aletheia điều chỉnh sắc thái phản chiếu cho lần đọc đầu tiên.",
      clarity: { title: "Sự rõ ràng", description: "Khi bạn cần gọi đúng tên vấn đề." },
      comfort: { title: "Sự an ủi", description: "Khi bạn cần một giọng nói dịu hơn." },
      challenge: { title: "Một thách thức", description: "Khi bạn sẵn sàng nghe điều không dễ chịu." },
      guidance: { title: "Để vũ trụ dẫn lối", description: "Khi bạn muốn buông kiểm soát và nhận điều đến." },
    },

    preview: {
      label: "một khoảnh khắc trước khi bắt đầu",
    },

    how: {
      title: "Cách Aletheia hoạt động",
      steps: [
        "Bạn mô tả điều đang diễn ra, hoặc để trống nếu muốn.",
        "Bạn chọn một biểu tượng để mở passage.",
        "AI chỉ diễn giải khi bạn chủ động yêu cầu.",
        "Lịch sử và trạng thái được giữ local trên thiết bị.",
      ],
    },
  },

  home: {
    kicker: "not a fortune • a mirror",
    title: "ALETHEIA",
    tagline: "Dừng lại. Phản chiếu. Hiểu.",
    subtitle: "Dừng lại trong vài phút. Gọi tên điều bạn đang mang. Rồi để một đoạn trích phản chiếu lại nó.",
    cta: "Lật một lá",
    ctaHint: "Bạn sẽ mô tả tình huống, chọn một biểu tượng, rồi nhận đoạn trích phù hợp nhất với khoảnh khắc này.",
    passageLabel: "PASSAGE OF THE PRACTICE",
    passageRef: "Nghi thức mở đầu của Aletheia",
    pillars: [
      "Lưu local, không cần tài khoản",
      "AI chỉ xuất hiện khi bạn yêu cầu",
      "Thiết kế chậm, tối, tập trung vào phản chiếu",
    ],
    footerText: "Không cần nhanh. Chỉ cần thành thật.",
  },

  situation: {
    title: "Bạn đang mang điều gì?",
    subtitle: "Viết ra vài dòng nếu muốn. Bản đọc vẫn hoạt động khi bạn để trống, nhưng lời phản chiếu sẽ sâu hơn khi bạn cho nó một nhịp thật.",
    placeholder: "Tôi đang cảm thấy... / Tôi đang đối mặt với...",
    inputKicker: "threshold note",
    inputHint: "Càng thành thật, passage và diễn giải càng đúng nhịp.",
    cta: "Tiến vào nghi thức",
    ctaLoading: "Đang chuẩn bị...",
    skipText: "Tôi chưa biết mình đang nghĩ gì",
    error: "Không thể bắt đầu đọc. Vui lòng thử lại.",
  },

  wildcard: {
    title: "Chọn một biểu tượng",
    hint: "Đừng chọn bằng lý trí quá nhanh.",
    metaSuffix: "dấu hiệu đang chờ bạn",
    cardTapHint: "Chạm để lật",
    autoCountdown: (s: number) => `Tự động chọn sau ${s}s`,
    autoButton: "Để vũ trụ chọn",
    autoButtonLoading: "Đang chọn...",
    selectedText: "Đang mở lá bài...",
    error: "Không thể chọn biểu tượng. Vui lòng thử lại.",
  },

  passage: {
    loading: "Đang tải...",
    languageLabel: "Ngôn ngữ",
    languageVi: "Tiếng Việt",
    languageEn: "Nguồn dịch/tiếng Anh",
    interpretLabel: "Diễn giải",
    interpretStreaming: "Đang gọi",
    interpretFallback: "Fallback",
    interpretDone: "Đã xong",
    interpretOnDemand: "Theo yêu cầu",

    aiKicker: "TÙY CHỌN",
    aiButton: "Xin diễn giải",
    aiHint: "AI chỉ mở khi bạn chủ động yêu cầu.",
    aiLoadingText: "Đang xin diễn giải...",
    aiLoadingHint: "Aletheia đang ghép tình huống, biểu tượng và ngữ cảnh của đoạn trích.",
    aiLabelOracle: "DIỄN GIẢI",
    aiLabelFallback: "DIỄN GIẢI NỘI TẠI",
    oracleLabel: "oracle reflection",
    fallbackLabel: "fallback reflection",

    shareButton: "Chia sẻ",
    completeButton: "Hoàn thành",
    completingButton: "Đang khép nghi thức...",
  },

  mirror: {
    title: "Gương",
    countLabel: (visible: number, total: number) => `${visible} / ${total} lần đọc đang hiện`,
    searchPlaceholder: "Tìm theo tình huống, nguồn hoặc biểu tượng",

    emptyTitle: "Chưa có lần đọc nào",
    emptyBody: "Bắt đầu lần đọc đầu tiên của bạn. Mỗi lần đọc sẽ được lưu lại ở đây.",
    emptyFilteredTitle: "Không có kết quả phù hợp",
    emptyFilteredBody: "Thử đổi từ khóa, bộ lọc hoặc cách sắp xếp để nhìn archive theo một góc khác.",
    startReading: "Bắt đầu đọc",
    noSituation: "Không có tình huống",

    filterAll: "Tất cả",
    filterFavorites: "Yêu thích",
    filterAI: "Có AI",
    filterShared: "Đã chia sẻ",
    sortLatest: "Mới nhất",
    sortOldest: "Cũ nhất",
    sortDepth: "Có chiều sâu",

    dateToday: "Hôm nay",
    dateYesterday: "Hôm qua",
    daysAgo: (n: number) => `${n} ngày trước`,

    a11yOpenReading: "Mở lần đọc",
    situationHidden: "Đã ẩn tình huống",
  },

  preview: {
    tapHint: "chạm để xem ngay",
  },

  settings: {
    title: "Cài đặt",
    subtitle: "Ngôn ngữ, thông báo và tùy chọn cá nhân.",

    languageSection: "Ngôn ngữ",
    languageVi: "Tiếng Việt",
    languageEn: "English",

    notificationSection: "Thông báo hằng ngày",
    notificationToggleOn: "Bật",
    notificationToggleOff: "Tắt",
    notificationTimeLabel: "Giờ gửi",
    notificationBody: "Mỗi sáng, Aletheia gửi một đoạn trích đến màn hình khóa — không cần mở app để đọc.",
    notificationPermissionDenied: "Quyền thông báo bị từ chối. Vào Cài đặt hệ thống để bật lại.",

    weeklySummarySection: "Gương nhìn lại cuối tuần",
    weeklySummaryToggleOn: "Bật",
    weeklySummaryToggleOff: "Tắt",
    weeklySummaryBody: "Mỗi thứ Bảy, thiết bị của bạn tự tổng kết tuần đọc — hoàn toàn offline, không có dữ liệu nào rời khỏi máy.",

    aboutSection: "Về Aletheia",
    aboutPrivacy: "Dữ liệu lưu local, không gửi đi đâu.",
    aboutVersion: "Phiên bản",
  },
};

export type Strings = typeof vi;
