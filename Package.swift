// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Judarn",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "Judarn",
            targets: ["Judarn"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-docc-plugin", from: "1.4.3"),
    ],
    targets: [
        .target(
            name: "Judarn",
            dependencies: [],
            path: "platforms/apple/Sources/Judarn"
        ),
        .testTarget(
            name: "JudarnTests",
            dependencies: ["Judarn"],
            path: "platforms/apple/Tests/JudarnTests"
        ),
    ]
)
