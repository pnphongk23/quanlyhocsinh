import SwiftUI
import UIKit

/// Poses of Mít that ship with the app (`design/prototype/public/mascot`). Mít appears in empty and
/// waiting states through `AppEmptyState`, and in the comment sheet as the pose of the chosen star level.
enum MascotPose: String, CaseIterable, Sendable {
    case main, cho, chao, khen
    case dangTai = "dang-tai"
    case sao0 = "sao-0", sao1 = "sao-1", sao2 = "sao-2", sao3 = "sao-3", sao4 = "sao-4", sao5 = "sao-5"

    /// Pose for a star level on a slip scale; no level yet means Mít is waiting. Five-star slips use the pose of
    /// each level 0...5; old three-star slips keep their 1...3 poses.
    static func forStars(_ stars: Int?, scale: Int = 5) -> MascotPose {
        guard let stars else { return .cho }
        if scale == SessionSlip.legacyScale {
            switch min(max(stars, 1), 3) {
            case 1: return .sao1
            case 2: return .sao2
            default: return .sao3
            }
        }
        switch min(max(stars, 0), 5) {
        case 0: return .sao0
        case 1: return .sao1
        case 2: return .sao2
        case 3: return .sao3
        case 4: return .sao4
        default: return .sao5
        }
    }

    var fileName: String { "mit-\(rawValue)" }

    /// Width / height of the 1x image, to reserve space before the bitmap is decoded.
    var aspectRatio: CGFloat {
        switch self {
        case .main: 182 / 256
        case .cho: 165 / 256
        case .chao: 204 / 256
        case .khen: 235 / 256
        case .dangTai: 199 / 256
        case .sao0: 160 / 256
        case .sao1: 193 / 256
        case .sao2: 227 / 256
        case .sao3: 190 / 256
        case .sao4: 236 / 256
        case .sao5: 255 / 256
        }
    }
}

/// Asset catalogs do not take WebP, so the files sit in the bundle next to each other as
/// `mit-<pose>.webp` and `mit-<pose>@2x.webp` and are decoded here.
@MainActor
enum MascotImage {
    private final class BundleToken {}
    private static var cache: [MascotPose: UIImage] = [:]

    static func image(for pose: MascotPose, bundle: Bundle = Bundle(for: BundleToken.self)) -> UIImage? {
        if let cached = cache[pose] { return cached }
        let scale = UIScreen.main.scale
        let candidates: [(suffix: String, scale: CGFloat)] = scale > 1 ? [("@2x", 2), ("", 1)] : [("", 1), ("@2x", 2)]
        for candidate in candidates {
            guard let url = bundle.url(forResource: pose.fileName + candidate.suffix, withExtension: "webp"),
                  let data = try? Data(contentsOf: url),
                  let image = UIImage(data: data, scale: candidate.scale) else { continue }
            cache[pose] = image
            return image
        }
        return nil
    }
}

/// Decorative, hidden from VoiceOver. Height is the token size; width follows the pose.
struct AppMascot: View {
    var pose: MascotPose = .cho
    var height: CGFloat = AppMetrics.emptyMascot

    var body: some View {
        Group {
            if let image = MascotImage.image(for: pose) {
                Image(uiImage: image).resizable().scaledToFit()
            } else {
                Color.clear
            }
        }
        .frame(width: height * pose.aspectRatio, height: height)
        .accessibilityHidden(true)
    }
}
