import SwiftUI

private struct GuardianDynamicTextModifier: ViewModifier {
    let style: AppTextStyle

    private var weight: Font.Weight {
        switch style.weight {
        case .extraLight: .ultraLight
        case .light: .light
        case .regular: .regular
        case .medium: .medium
        case .semiBold: .semibold
        case .bold: .bold
        case .extraBold: .heavy
        }
    }

    func body(content: Content) -> some View {
        content
            .font(.custom(AppFont.postScriptName, size: style.size, relativeTo: .body).weight(weight))
            .lineSpacing(style.extraLineSpacing)
            .tracking(style.tracking)
    }
}

extension View {
    func appDynamicText(_ style: AppTextStyle) -> some View {
        modifier(GuardianDynamicTextModifier(style: style))
    }
}

// MARK: - Màu riêng của màn phụ huynh (`guardian.module.css`)

enum GuardianColors {
    /// `.stars`, `.barFill`, `.star` — `#E5A50A`.
    static let star = Color(.sRGB, red: 229 / 255, green: 165 / 255, blue: 10 / 255, opacity: 1)
    /// `.noteBox p` — `#3B2A00`.
    static let noteText = Color(.sRGB, red: 59 / 255, green: 42 / 255, blue: 0 / 255, opacity: 1)
}

/// `24 × 24` glyphs from `src/roles/guardian/GuardianIcon.tsx` (stroke 2, round caps).
enum GuardianGlyphName: Sendable {
    case home, attendance, scores, comments, reports
    case chevronLeft, chevronRight
    case vocabulary, reading, speaking, exercise
}

struct GuardianGlyph: Shape {
    let name: GuardianGlyphName

    func path(in rect: CGRect) -> Path {
        // Paths are authored in a 24 × 24 box and scaled into `rect`.
        let scale = min(rect.width, rect.height) / 24
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scale, y: rect.minY + y * scale)
        }
        var path = Path()
        switch name {
        case .home:
            path.move(to: point(3, 11))
            path.addLine(to: point(12, 3))
            path.addLine(to: point(21, 11))
            path.addLine(to: point(21, 20))
            path.addQuadCurve(to: point(20, 21), control: point(21, 21))
            path.addLine(to: point(15, 21))
            path.addLine(to: point(15, 15))
            path.addLine(to: point(9, 15))
            path.addLine(to: point(9, 21))
            path.addLine(to: point(4, 21))
            path.addQuadCurve(to: point(3, 20), control: point(3, 21))
            path.closeSubpath()
        case .attendance:
            path.move(to: point(20, 6))
            path.addLine(to: point(9, 17))
            path.addLine(to: point(4, 12))
        case .scores:
            path.move(to: point(4, 20))
            path.addLine(to: point(4, 10))
            path.move(to: point(10, 20))
            path.addLine(to: point(10, 4))
            path.move(to: point(16, 20))
            path.addLine(to: point(16, 13))
            path.move(to: point(22, 20))
            path.addLine(to: point(2, 20))
        case .comments:
            path.move(to: point(21, 15))
            path.addQuadCurve(to: point(19, 17), control: point(21, 17))
            path.addLine(to: point(7, 17))
            path.addLine(to: point(3, 21))
            path.addLine(to: point(3, 5))
            path.addQuadCurve(to: point(5, 3), control: point(3, 3))
            path.addLine(to: point(19, 3))
            path.addQuadCurve(to: point(21, 5), control: point(21, 3))
            path.closeSubpath()
        case .reports:
            path.move(to: point(14, 3))
            path.addLine(to: point(6, 3))
            path.addQuadCurve(to: point(4, 5), control: point(4, 3))
            path.addLine(to: point(4, 19))
            path.addQuadCurve(to: point(6, 21), control: point(4, 21))
            path.addLine(to: point(18, 21))
            path.addQuadCurve(to: point(20, 19), control: point(20, 21))
            path.addLine(to: point(20, 9))
            path.closeSubpath()
            path.move(to: point(14, 3))
            path.addLine(to: point(14, 9))
            path.addLine(to: point(20, 9))
        case .chevronLeft:
            path.move(to: point(15, 18))
            path.addLine(to: point(9, 12))
            path.addLine(to: point(15, 6))
        case .chevronRight:
            path.move(to: point(9, 18))
            path.addLine(to: point(15, 12))
            path.addLine(to: point(9, 6))
        case .vocabulary:
            path.move(to: point(4, 7))
            path.addLine(to: point(4, 4))
            path.addLine(to: point(20, 4))
            path.addLine(to: point(20, 7))
            path.move(to: point(9, 20))
            path.addLine(to: point(15, 20))
            path.move(to: point(12, 4))
            path.addLine(to: point(12, 20))
        case .reading:
            path.move(to: point(2, 4))
            path.addLine(to: point(9, 4))
            path.addQuadCurve(to: point(12, 7), control: point(12, 4))
            path.addLine(to: point(12, 20))
            path.addQuadCurve(to: point(10, 18), control: point(12, 18))
            path.addLine(to: point(2, 18))
            path.closeSubpath()
            path.move(to: point(22, 4))
            path.addLine(to: point(15, 4))
            path.addQuadCurve(to: point(12, 7), control: point(12, 4))
            path.addLine(to: point(12, 20))
            path.addQuadCurve(to: point(14, 18), control: point(12, 18))
            path.addLine(to: point(22, 18))
            path.closeSubpath()
        case .speaking:
            path.move(to: point(12, 2))
            path.addQuadCurve(to: point(9, 5), control: point(9, 2))
            path.addLine(to: point(9, 12))
            path.addQuadCurve(to: point(15, 12), control: point(15, 12))
            path.addLine(to: point(15, 5))
            path.addQuadCurve(to: point(12, 2), control: point(15, 2))
            path.closeSubpath()
            path.move(to: point(19, 10))
            path.addLine(to: point(19, 12))
            path.addQuadCurve(to: point(5, 12), control: point(12, 19))
            path.addLine(to: point(5, 10))
            path.move(to: point(12, 19))
            path.addLine(to: point(12, 22))
        case .exercise:
            path.move(to: point(12, 20))
            path.addLine(to: point(21, 20))
            path.move(to: point(16.5, 3.5))
            path.addQuadCurve(to: point(19.5, 6.5), control: point(19.5, 3.5))
            path.addLine(to: point(7, 19))
            path.addLine(to: point(3, 20))
            path.addLine(to: point(4, 16))
            path.closeSubpath()
        }
        return path
    }
}

struct GuardianIcon: View {
    let name: GuardianGlyphName
    var size: CGFloat = 22

    var body: some View {
        GuardianGlyph(name: name)
            .stroke(style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

extension HomeworkKind {
    var guardianGlyph: GuardianGlyphName {
        switch self {
        case .vocabulary: .vocabulary
        case .reading: .reading
        case .speaking: .speaking
        case .exercise: .exercise
        }
    }
}

// MARK: - Sao 1/2/3 (`.stars`, ảnh 14/15)

struct GuardianStarShape: Shape {
    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width, rect.height) / 24
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scale, y: rect.minY + y * scale)
        }
        var path = Path()
        path.move(to: point(12, 2.5))
        path.addLine(to: point(14.9, 8.5))
        path.addLine(to: point(21.5, 9.4))
        path.addLine(to: point(16.7, 14))
        path.addLine(to: point(17.9, 20.5))
        path.addLine(to: point(12, 17.4))
        path.addLine(to: point(6.1, 20.5))
        path.addLine(to: point(7.3, 14))
        path.addLine(to: point(2.5, 9.4))
        path.addLine(to: point(9.1, 8.5))
        path.closeSubpath()
        return path
    }
}

struct GuardianStars: View {
    let level: Stars
    var size: CGFloat = 18
    var label: String? = nil

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<level.rawValue, id: \.self) { _ in
                GuardianStarShape()
                    .fill(GuardianColors.star)
                    .overlay(GuardianStarShape().stroke(GuardianColors.star, lineWidth: 1.5 * size / 24))
                    .frame(width: size, height: size)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "\(level.rawValue) sao")
    }
}

// MARK: - PageHeader (`.pageHeader`, `.eyebrow`, `.pageTitle`, `.backButton`)

/// Dòng phụ (lớp · tháng, tên con) dưới thanh điều hướng hệ thống; tiêu đề do `navigationTitle` đảm nhiệm.
struct GuardianPageHeader: View {
    let eyebrow: String?
    var title: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let eyebrow, !eyebrow.isEmpty {
                Text(eyebrow)
                    .appDynamicText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            if let title {
                Text(title)
                    .appDynamicText(AppText.title)
                    .foregroundStyle(AppColors.text)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Khung cuộn của mọi trang phụ huynh: nằm dưới thanh điều hướng và trên tab bar hệ thống.
struct GuardianScroll<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) { content }
                .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                .padding(.top, TeacherMetrics.listGap)
                .padding(.bottom, TeacherMetrics.cardPadding)
        }
        .scrollIndicators(.hidden)
        .background(AppColors.background.ignoresSafeArea())
    }
}

// MARK: - Chọn con (`.chips`, `.chip`, ảnh 15)

struct GuardianChildChips: View {
    let children: [GuardianChildData]
    let selectedID: String?
    let select: (String) -> Void

    var body: some View {
        if children.count > 1 {
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(children) { child in
                        chip(child)
                    }
                }
                .padding(.bottom, 2)
            }
            .scrollIndicators(.hidden)
        }
    }

    private func chip(_ child: GuardianChildData) -> some View {
        let active = child.student.id == selectedID
        return Button { select(child.student.id) } label: {
            HStack(spacing: 8) {
                Text(GuardianFormat.initials(child.student.name))
                    .font(AppFont.font(size: 12, weight: .bold))
                    .foregroundStyle(active ? AppColors.primary : AppColors.primaryInk)
                    .frame(width: 24, height: 24)
                    .background(active ? AppColors.surface : AppColors.primarySoft, in: Circle())
                Text(GuardianFormat.shortName(child.student.name))
                    .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
            }
            .foregroundStyle(active ? AppColors.onPrimary : AppColors.text)
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .background(active ? AppColors.primary : AppColors.surface, in: Capsule())
            .fixedSize()
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }
}

// MARK: - Chọn tháng (`.monthSwitch`)

struct GuardianMonthSwitch: View {
    let month: String
    let months: [String]
    let select: (String) -> Void

    private var sorted: [String] { months.isEmpty ? [month] : months }
    private var index: Int { sorted.firstIndex(of: month) ?? 0 }

    var body: some View {
        HStack(spacing: 8) {
            Button { if index + 1 < sorted.count { select(sorted[index + 1]) } } label: {
                GuardianIcon(name: .chevronLeft, size: 18)
                    .foregroundStyle(index + 1 < sorted.count ? AppColors.primaryInk : AppColors.muted.opacity(0.4))
                    .frame(width: 40, height: 40)
            }
            .accessibilityLabel(String(localized: "feature.guardian.xem.thang.truoc"))
            .disabled(index + 1 >= sorted.count)
            Text(GuardianFormat.monthLabel(month))
                .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            Button { if index > 0 { select(sorted[index - 1]) } } label: {
                GuardianIcon(name: .chevronRight, size: 18)
                    .foregroundStyle(index > 0 ? AppColors.primaryInk : AppColors.muted.opacity(0.4))
                    .frame(width: 40, height: 40)
            }
            .accessibilityLabel(String(localized: "feature.guardian.xem.thang.sau"))
            .disabled(index == 0)
        }
        .padding(4)
        .background(AppColors.surface, in: Capsule())
    }
}

// MARK: - Khối ghi chú (`.noteBlock`)

struct GuardianNoteBlock: View {
    let label: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .appDynamicText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                .foregroundStyle(AppColors.muted)
            Text(text)
                .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.chip))
    }
}

// MARK: - Khối "Điều cô muốn chia sẻ" (`.noteBox`)

/// `GuardianOverviewPage` ảnh 15: hộp nền `--color-warning-soft`, tiêu đề 15/600
/// `--color-warning`, nội dung 15/1.55 màu nâu đậm, giữ nguyên xuống dòng (`white-space: pre-line`).
struct GuardianNoteBox: View {
    let text: String

    private static let bodyInk = Color(.sRGB, red: 0x3B / 255, green: 0x2A / 255,
                                       blue: 0x00 / 255, opacity: 1)

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.guardian.ieu.co.muon.chia.se"))
                .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.warning)
            Text(text)
                .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                .foregroundStyle(Self.bodyInk)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.warningSoft, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}

// MARK: - Thẻ số liệu (`.statCard`, `.stats4`)

struct GuardianStatCard: View {
    let label: String
    let value: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            Text(value)
                .appDynamicText(AppTextStyle(size: 26, weight: .bold, lineHeight: 31.2))
                .foregroundStyle(AppColors.text)
            Text(detail)
                .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 19.6))
                .foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}

struct GuardianStatCell: View {
    let value: Int
    let name: String

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .appDynamicText(AppTextStyle(size: 22, weight: .bold, lineHeight: 25.3))
                .foregroundStyle(AppColors.text)
            Text(name)
                .appDynamicText(AppTextStyle(size: 12, weight: .regular, lineHeight: 15.6))
                .foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 4)
        .padding(.vertical, 10)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.row))
    }
}

// MARK: - Hàng điểm (`.scoreRow`)

struct GuardianScoreRows: View {
    let rows: [GuardianScoreRow]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.test.name)
                            .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                            .foregroundStyle(AppColors.text)
                        Text(GuardianFormat.longDayMonth(row.test.date))
                            .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                            .foregroundStyle(AppColors.muted)
                    }
                    Spacer(minLength: 0)
                    Text(row.value == nil ? String(localized: "feature.guardian.noScore") : GuardianFormat.scoreText(row.value))
                        .appDynamicText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.text)
                }
                .padding(.vertical, 8)
                .overlay(alignment: .top) {
                    if index > 0 { AppColors.divider.frame(height: 1) }
                }
            }
        }
    }
}

// MARK: - Thẻ phiếu buổi học (`.ticketCard`, `.ticketCardNew`)

struct GuardianTicketCard<Content: View>: View {
    var isNew = false
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .overlay {
            if isNew {
                RoundedRectangle(cornerRadius: AppRadius.card)
                    .strokeBorder(AppColors.primary, lineWidth: 2)
            }
        }
    }
}

/// Title row inside a card (`.cardHead h2`). A header above a card is an `AppSection`.
struct GuardianCardHead: View {
    let title: String
    var trailing: AnyView? = nil
    var titleStyle: AppTextStyle = AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24)

    var body: some View {
        HStack(spacing: 12) {
            Text(title)
                .appDynamicText(titleStyle)
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            if let trailing { trailing }
        }
    }
}

// MARK: - Danh sách phần BTVN (`.hwList`, `.hwRow`)

struct GuardianHomeworkParts: View {
    let parts: [GuardianHomeworkPart]
    var showDescriptions = false

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(parts.enumerated()), id: \.element.id) { index, part in
                HStack(alignment: .top, spacing: 10) {
                    GuardianIcon(name: part.kind.guardianGlyph, size: 18)
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(width: 36, height: 36)
                        .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(part.kindLabel.uppercased())
                            .appDynamicText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18, tracking: 0.24))
                            .foregroundStyle(AppColors.primaryInk)
                        Text(part.title)
                            .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 20.25))
                            .foregroundStyle(AppColors.text)
                        if showDescriptions, !part.detail.isEmpty {
                            Text(part.detail)
                                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                                .foregroundStyle(AppColors.muted)
                        }
                        if part.graded, part.level == nil {
                            Text(String(localized: "feature.guardian.co.cham.xong.la.hien.ngay"))
                                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                                .foregroundStyle(AppColors.muted)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if part.graded {
                        AppPill(title: part.level?.guardianLabel ?? String(localized: "feature.guardian.chua.cham"),
                                tone: part.level?.guardianTone ?? .neutral)
                            .fixedSize()
                    }
                }
                .padding(.vertical, 8)
                .overlay(alignment: .top) {
                    if index > 0 { AppColors.divider.frame(height: 1) }
                }
            }
        }
    }
}

// MARK: - Trạng thái rỗng / chữ phụ

struct GuardianEmptyState: View {
    let title: String
    let detail: String

    var body: some View {
        AppEmptyState(title: title, description: detail, mascot: .cho)
    }
}

struct GuardianMutedText: View {
    let text: String
    var body: some View {
        Text(text)
            .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 20.3))
            .foregroundStyle(AppColors.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct GuardianErrorText: View {
    let text: String
    var body: some View {
        Text(text)
            .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 20.3))
            .foregroundStyle(AppColors.error)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
