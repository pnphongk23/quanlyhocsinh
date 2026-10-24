import SwiftUI
import UIKit

/// Poses of Mít that ship with the app (`design/prototype/public/mascot`). Mít only appears in
/// empty and waiting states; screens never draw it directly, they go through `AppEmptyState`.
enum MascotPose: String, CaseIterable, Sendable {
    case main, cho, chao, khen
    case dangTai = "dang-tai"

    var fileName: String { "mit-\(rawValue)" }

    /// Width / height of the 1x image, to reserve space before the bitmap is decoded.
    var aspectRatio: CGFloat {
        switch self {
        case .main: 182 / 256
        case .cho: 165 / 256
        case .chao: 204 / 256
        case .khen: 235 / 256
        case .dangTai: 199 / 256
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
