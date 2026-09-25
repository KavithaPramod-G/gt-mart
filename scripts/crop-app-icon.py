"""Generate all app icon sizes from the RROne basket-style square source."""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets"
SOURCE = ASSETS / "rrone-app-icon-feature-style.png"
FALLBACK = ASSETS / "rrone-app-icon-1024.png"
LEGACY = ASSETS / "rr-basket-app-icon-feature-style.png"

# Mint background matching RR Basket-style icon
BG_COLOR = (232, 245, 238)  # #E8F5EE


def resolve_source() -> tuple[Path, Image.Image]:
    for path in (SOURCE, FALLBACK, LEGACY):
        if path.exists():
            img = Image.open(path).convert("RGB")
            if img.width != img.height:
                side = min(img.width, img.height)
                left = (img.width - side) // 2
                top = (img.height - side) // 2
                img = img.crop((left, top, left + side, top + side))
            return path, img

    raise FileNotFoundError("No app icon source found in assets/")


def pad_for_adaptive_safe_zone(
    img: Image.Image, canvas: int = 1024, bg: tuple[int, int, int] = BG_COLOR
) -> Image.Image:
    """Keep full icon visible inside Android adaptive icon safe zone (~72%)."""
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


def main() -> None:
    src_path, img = resolve_source()
    bg = BG_COLOR

    icon_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save(ASSETS / "rrone-app-icon-1024.png", optimize=True)
    icon_1024.save(ASSETS / "icon.png", optimize=True)
    icon_1024.save(ASSETS / "splash-icon.png", optimize=True)

    img.resize((512, 512), Image.Resampling.LANCZOS).save(
        ASSETS / "play-store-icon-512x512.png", optimize=True
    )

    adaptive = pad_for_adaptive_safe_zone(icon_1024, 1024, bg)
    adaptive.convert("RGB").save(ASSETS / "android-icon-foreground.png", optimize=True)
    adaptive.convert("RGB").save(ASSETS / "rrone-android-adaptive-foreground.png", optimize=True)

    Image.new("RGB", (1024, 1024), bg).save(
        ASSETS / "android-icon-background.png", optimize=True
    )
    img.resize((192, 192), Image.Resampling.LANCZOS).save(
        ASSETS / "favicon.png", optimize=True
    )

    print(f"Source: {src_path}")
    print("Background: #E8F5EE")
    print("Updated: icon.png, splash-icon.png, play-store-icon-512x512.png,")
    print("         android-icon-foreground.png, android-icon-background.png, favicon.png")


if __name__ == "__main__":
    main()
