import UIKit

/// Post-capture status for a Twin scan. Four states, one screen:
/// saved on the phone, uploading (percent), failed with Retry, or done.
/// UIKit only — this replaces the WebView upload spinner and the review funnel.
final class TwinUploadStatusViewController: UIViewController {

    enum Phase: Equatable {
        case savedLocally
        case uploading(percent: Int)
        case failed(message: String)
        case done
    }

    /// True when capture was started with a project id. False means the uploader
    /// creates one through the existing quick-scan space API.
    var projectAttached = false
    var onRetry: (() -> Void)?
    var onClose: (() -> Void)?

    private var phase: Phase = .savedLocally
    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    private let percentLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private let closeButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        isModalInPresentation = true
        view.backgroundColor = UIColor(red: 0x0B / 255, green: 0x0F / 255, blue: 0x15 / 255, alpha: 1)

        titleLabel.font = .systemFont(ofSize: 28, weight: .semibold)
        titleLabel.textColor = .white
        titleLabel.numberOfLines = 0

        detailLabel.font = .systemFont(ofSize: 17, weight: .regular)
        detailLabel.textColor = UIColor(red: 0xF8 / 255, green: 0xFA / 255, blue: 0xFC / 255, alpha: 1)
        detailLabel.numberOfLines = 0

        percentLabel.font = .monospacedDigitSystemFont(ofSize: 44, weight: .semibold)
        percentLabel.textColor = .white

        configure(retryButton, title: "Retry", filled: true)
        configure(closeButton, title: "Close", filled: false)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [titleLabel, percentLabel, detailLabel, retryButton, closeButton])
        stack.axis = .vertical
        stack.alignment = .fill
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
            retryButton.heightAnchor.constraint(equalToConstant: 52),
            closeButton.heightAnchor.constraint(equalToConstant: 52),
        ])
        render()
    }

    func apply(_ phase: Phase) {
        self.phase = phase
        guard isViewLoaded else { return }
        render()
    }

    private func render() {
        switch phase {
        case .savedLocally:
            titleLabel.text = "Saved locally"
            percentLabel.isHidden = true
            detailLabel.text = projectLine + " Upload starts now and keeps going with the screen off."
            retryButton.isHidden = true
            closeButton.isHidden = true
        case let .uploading(percent):
            titleLabel.text = "Uploading"
            percentLabel.isHidden = false
            percentLabel.text = "\(max(0, min(100, percent)))%"
            detailLabel.text = "You can lock the phone or put it in a pocket. This upload continues."
            retryButton.isHidden = true
            closeButton.isHidden = true
        case let .failed(message):
            titleLabel.text = "Couldn't upload"
            percentLabel.isHidden = true
            detailLabel.text = message
            retryButton.isHidden = onRetry == nil
            closeButton.isHidden = false
            closeButton.setTitle("Close", for: .normal)
        case .done:
            titleLabel.text = "Done"
            percentLabel.isHidden = true
            detailLabel.text = projectAttached
                ? "The scan is in the selected project."
                : "The scan is in a new project."
            retryButton.isHidden = true
            closeButton.isHidden = false
            closeButton.setTitle("Close", for: .normal)
        }
    }

    private var projectLine: String {
        projectAttached
            ? "Saving into the project you selected."
            : "No project was selected, so one is created for this scan."
    }

    private func configure(_ button: UIButton, title: String, filled: Bool) {
        var config = UIButton.Configuration.filled()
        config.title = title
        config.baseForegroundColor = .white
        config.baseBackgroundColor = filled
            ? UIColor(red: 0x3D / 255, green: 0x8E / 255, blue: 0xFF / 255, alpha: 1)
            : UIColor(white: 1, alpha: 0.12)
        config.cornerStyle = .fixed
        config.background.cornerRadius = 12
        config.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 18, bottom: 14, trailing: 18)
        button.configuration = config
    }

    @objc private func retryTapped() { onRetry?() }

    @objc private func closeTapped() { onClose?() }
}
