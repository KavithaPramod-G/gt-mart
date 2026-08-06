"""Generate all app icon sizes from a square source image."""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets"
SOURCE = ASSETS / "rr-basket-app-icon-feature-style.png"
FALLBACK = ASSETS / "rr-basket-app-icon-1024.png"
LEGACY = ASSETS / "rr-basket-gt-mart-kavali-icon.png"

BG_COLOR = (232, 245, 238)  # #E8F5EE


def resolve_source() -> Path:
    for path in (SOURCE, FALLBACK, LEGACY):
        if path.exists():
            return path
    raise FileNotFoundError("No square app icon source found in assets/")


def pad_for_adaptive_safe_zone(img: Image.Image, canvas: int = 1024) -> Image.Image:
    """Keep full icon visible inside Android adaptive icon safe zone (~72%)."""
    safe = int(canvas * 0.78)
    fitted = img.copy()
    fitted.thumbnail((safe, safe), Image.Resampling.LANCZOS)
    canvas_img = Image.new("RGBA", (canvas, canvas), (*BG_COLOR, 255))
    if fitted.mode != "RGBA":
        fitted = fitted.convert("RGBA")
    x = (canvas - fitted.width) // 2
    y = (canvas - fitted.height) // 2
    canvas_img.paste(fitted, (x, y))
    return canvas_img


def main() -> None:
    src_path = resolve_source()
    img = Image.open(src_path).convert("RGB")

    if img.width != img.height:
        side = min(img.width, img.height)
        left = (img.width - side) // 2
        top = (img.height - side) // 2
        img = img.crop((left, top, left + side, top + side))

    icon_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save(ASSETS / "icon.png", optimize=True)
    icon_1024.save(ASSETS / "rr-basket-icon-cropped.png", optimize=True)

    img.resize((512, 512), Image.Resampling.LANCZOS).save(
        ASSETS / "play-store-icon-512x512.png", optimize=True
    )

    pad_for_adaptive_safe_zone(icon_1024, 1024).save(
        ASSETS / "android-icon-foreground.png", optimize=True
    )
    Image.new("RGB", (1024, 1024), BG_COLOR).save(
        ASSETS / "android-icon-background.png", optimize=True
    )
    img.resize((192, 192), Image.Resampling.LANCZOS).save(
        ASSETS / "favicon.png", optimize=True
    )

    print(f"Source: {src_path}")
    print("Updated: icon.png, play-store-icon-512x512.png,")
    print("         android-icon-foreground.png, android-icon-background.png, favicon.png")


if __name__ == "__main__":
    main()
