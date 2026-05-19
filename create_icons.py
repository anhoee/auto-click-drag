from pathlib import Path

from auto_click_drag import create_status_icon


def main() -> None:
    assets = Path("assets")
    assets.mkdir(exist_ok=True)

    create_status_icon("brand", 256).save(assets / "brand.png")
    create_status_icon("running", 256).save(assets / "running.png")
    create_status_icon("stopped", 256).save(assets / "stopped.png")
    create_status_icon("brand", 256).save(
        assets / "AutoClickDrag.ico",
        sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)],
    )

    print("Icons created in assets/")


if __name__ == "__main__":
    main()

