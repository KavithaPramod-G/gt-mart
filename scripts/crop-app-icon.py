"""Generate all app icon sizes from a square source image."""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets"
SOURCE = ASSETS / "rrone-app-icon-1024.png"
ADAPTIVE_SOURCE = ASSETS / "rrone-android-adaptive-foreground.png"
FEATURE_SOURCE = ASSETS / "rrone-play-feature-graphic.png"
FALLBACK = ASSETS / "rr-basket-app-icon-1024.png"
LEGACY = ASSETS / "rr-basket-gt-mart-kavali-icon.png"

# RROne forest green; sampled from the source icon if available.
BG_COLOR = (4, 68, 44)  # #04442C


def resolve_source() -> Path:
    for path in (SOURCE, FALLBACK, LEGACY):
        if path.exists():
            return path
    raise FileNotFoundError("No square app icon source found in assets/")


def sample_background(img: Image.Image) -> tuple[int, int, int]:
    rgb = img.convert("RGB")
    return rgb.getpixel((8, 8))


def pad_for_adaptive_safe_zone(
    img: Image.Image, canvas: int = 1024, bg: tuple[int, int, int] = BG_COLOR
) -> Image.Image:
    """Keep the wordmark inside the Android adaptive icon safe zone (~72%)."""
    safe = int(canvas * 0.72)
    fitted = img.copy()
    fitted.thumbnail((safe, safe), Image.Resampling.LANCZOS)
    canvas_img = Image.new("RGBA", (canvas, canvas), (*bg, 255))
    if fitted.mode != "RGBA":
        fitted = fitted.convert("RGBA")
    x = (canvas - fitted.width) // 2
    y = (canvas - fitted.height) // 2
    canvas_img.paste(fitted, (x, y))
    return canvas_img


def cover_resize(img: Image.Image, width: int, height: int) -> Image.Image:
    src = img.convert("RGB")
    scale = max(width / src.width, height / src.height)
    resized = src.resize(
        (max(1, round(src.width * scale)), max(1, round(src.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def main() -> None:
    src_path = resolve_source()
    img = Image.open(src_path).convert("RGB")
    bg = sample_background(img)

    if img.width != img.height:
        side = min(img.width, img.height)
        left = (img.width - side) // 2
        top = (img.height - side) // 2
        img = img.crop((left, top, left + side, top + side))

    icon_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save(ASSETS / "icon.png", optimize=True)
    icon_1024.save(ASSETS / "splash-icon.png", optimize=True)

    img.resize((512, 512), Image.Resampling.LANCZOS).save(
        ASSETS / "play-store-icon-512x512.png", optimize=True
    )

    pad_for_adaptive_safe_zone(icon_1024, 1024, bg).save(
        ASSETS / "android-icon-foreground.png", optimize=True
    )
    if ADAPTIVE_SOURCE.exists():
        adaptive = Image.open(ADAPTIVE_SOURCE).convert("RGB")
        adaptive.resize((1024, 1024), Image.Resampling.LANCZOS).save(
            ASSETS / "android-icon-foreground.png", optimize=True
        )
    Image.new("RGB", (1024, 1024), bg).save(
        ASSETS / "android-icon-background.png", optimize=True
    )
    img.resize((192, 192), Image.Resampling.LANCZOS).save(
        ASSETS / "favicon.png", optimize=True
    )

    if FEATURE_SOURCE.exists():
        cover_resize(Image.open(FEATURE_SOURCE), 1024, 500).save(
            ASSETS / "play-feature-graphic-1024x500.png", optimize=True
        )

    hex_bg = "#{:02X}{:02X}{:02X}".format(*bg)
    print(f"Source: {src_path}")
    print(f"Background: {hex_bg}")
    print("Updated: icon.png, splash-icon.png, play-store-icon-512x512.png,")
    print("         android-icon-foreground.png, android-icon-background.png, favicon.png")
    if FEATURE_SOURCE.exists():
        print("         play-feature-graphic-1024x500.png")


if __name__ == "__main__":
    main()
