import threading
import time
import tkinter as tk
from pathlib import Path

try:
    from PIL import ImageGrab
except ImportError:
    ImageGrab = None

import auto_click_drag as acd


def point_inside(widget: tk.Widget, x: int, y: int) -> bool:
    return (
        widget.winfo_rootx() <= x <= widget.winfo_rootx() + widget.winfo_width()
        and widget.winfo_rooty() <= y <= widget.winfo_rooty() + widget.winfo_height()
    )


def main() -> None:
    old_clipboard = acd.get_clipboard_text()
    original_copy_selected_text = acd.copy_selected_text

    captured = {"text": "", "released_on_drop": False, "click_count": 0, "tab_count": 0, "error": None}

    app = acd.AutoClickDragApp()
    app.withdraw()

    window = tk.Toplevel(app)
    window.title("Test trực quan kéo-thả")
    window.geometry("760x420+160+140")
    window.attributes("-topmost", True)
    window.configure(bg="#eef2f7")

    title = tk.Label(
        window,
        text="Test trực quan: kéo chữ/ký tự từ điểm nguồn sang điểm thả",
        bg="#172033",
        fg="white",
        font=("Segoe UI", 15, "bold"),
        anchor="w",
        padx=18,
        pady=12,
    )
    title.pack(fill="x")

    body = tk.Frame(window, bg="#eef2f7")
    body.pack(fill="both", expand=True, padx=22, pady=22)
    body.columnconfigure(0, weight=1)
    body.columnconfigure(1, weight=1)

    source_panel = tk.Frame(body, bg="white", highlightbackground="#cbd5e1", highlightthickness=1)
    source_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 12))
    target_panel = tk.Frame(body, bg="white", highlightbackground="#cbd5e1", highlightthickness=1)
    target_panel.grid(row=0, column=1, sticky="nsew", padx=(12, 0))

    tk.Label(source_panel, text="Điểm kéo", bg="white", fg="#0f172a", font=("Segoe UI", 12, "bold")).pack(anchor="w", padx=16, pady=(16, 8))
    tk.Label(
        source_panel,
        text="Double-click sẽ chọn chữ. Nếu thấy dấu '-' thì app click thêm 1 lần trước khi giữ-kéo.",
        bg="white",
        fg="#475569",
        wraplength=300,
        justify="left",
    ).pack(anchor="w", padx=16)

    source_entry = tk.Entry(source_panel, font=("Segoe UI", 22, "bold"), justify="center", fg="#172033")
    source_entry.insert(0, "ABC-123")
    source_entry.pack(fill="x", padx=16, pady=(22, 10), ipady=10)

    click_label = tk.Label(source_panel, text="Số lần nhấn tại nguồn: 0", bg="white", fg="#334155", font=("Segoe UI", 11))
    click_label.pack(anchor="w", padx=16, pady=(4, 16))

    tk.Label(target_panel, text="Điểm thả", bg="white", fg="#0f172a", font=("Segoe UI", 12, "bold")).pack(anchor="w", padx=16, pady=(16, 8))
    tk.Label(
        target_panel,
        text="Nếu kéo-thả đúng, chữ/ký tự được chọn sẽ hiện ở khung bên dưới.",
        bg="white",
        fg="#475569",
        wraplength=300,
        justify="left",
    ).pack(anchor="w", padx=16)

    drop_box = tk.Label(
        target_panel,
        text="ĐANG CHỜ THẢ",
        bg="#dbeafe",
        fg="#1e3a8a",
        font=("Segoe UI", 20, "bold"),
        relief="solid",
        bd=1,
    )
    drop_box.pack(fill="both", expand=True, padx=16, pady=(22, 10))

    result_label = tk.Label(window, text="Đang chuẩn bị test...", bg="#eef2f7", fg="#172033", font=("Segoe UI", 12, "bold"))
    result_label.pack(fill="x", padx=22, pady=(0, 16))

    source_entry.bind(
        "<ButtonPress-1>",
        lambda event: (
            captured.__setitem__("click_count", captured["click_count"] + 1),
            click_label.configure(text=f"Số lần nhấn tại nguồn: {captured['click_count']}"),
        ),
    )
    source_entry.bind(
        "<KeyPress-Tab>",
        lambda event: (
            captured.__setitem__("tab_count", captured["tab_count"] + 1),
            result_label.configure(text=f"Đã bấm Tab sau khi thả. Tab count: {captured['tab_count']}"),
            "break",
        )[2],
    )

    def visual_copy_selected_text(copy_delay: float) -> str:
        text = original_copy_selected_text(copy_delay)
        captured["text"] = text
        return text

    def on_release(event) -> None:
        if point_inside(drop_box, event.x_root, event.y_root):
            captured["released_on_drop"] = True
            marker = "có dấu '-'" if "-" in captured["text"] else "không có dấu '-'"
            drop_box.configure(text=captured["text"] or "(không copy được chữ)", bg="#dcfce7", fg="#166534")
            result_label.configure(text=f"Thả đúng điểm. Nội dung: {captured['text']} | {marker}")

    window.bind_all("<ButtonRelease-1>", on_release)

    def save_screenshot() -> None:
        if ImageGrab is None:
            return
        output_dir = Path("test-results")
        output_dir.mkdir(exist_ok=True)
        x1 = window.winfo_rootx()
        y1 = window.winfo_rooty()
        x2 = x1 + window.winfo_width()
        y2 = y1 + window.winfo_height()
        image = ImageGrab.grab(bbox=(x1, y1, x2, y2))
        image.save(output_dir / "visual_drag_test.png")

    def worker() -> None:
        try:
            time.sleep(0.5)
            source = (source_entry.winfo_rootx() + 50, source_entry.winfo_rooty() + source_entry.winfo_height() // 2)
            target = (drop_box.winfo_rootx() + drop_box.winfo_width() // 2, drop_box.winfo_rooty() + drop_box.winfo_height() // 2)
            config = acd.StepConfig(
                source_points=[source],
                target_point=target,
                random_source=False,
                repeat_count=1,
                cycle_delay=0,
                click_count=2,
                click_interval=0.35,
                hold_delay=0.45,
                drag_duration=2.40,
                key_name="tab",
                detect_marker=True,
                marker_text="-",
                copy_delay=0.30,
            )
            acd.copy_selected_text = visual_copy_selected_text
            app._run_cycle(config)
            app.after(600, save_screenshot)
            app.after(4200, app.quit)
        except Exception as exc:
            captured["error"] = repr(exc)
            result_label.configure(text=f"Lỗi test: {exc}", fg="#b91c1c")
            app.after(1200, app.quit)

    def start_test() -> None:
        source_entry.focus_force()
        result_label.configure(text="Đang chạy chậm: double-click để chọn, kiểm tra '-', click thêm 1 lần nếu cần, rồi giữ-kéo...")
        threading.Thread(target=worker, daemon=True).start()

    app.after(800, start_test)
    app.after(10000, app.quit)
    app.mainloop()

    acd.copy_selected_text = original_copy_selected_text
    if old_clipboard is not None:
        acd.set_clipboard_text(old_clipboard)
    app.on_close()

    print("error:", captured["error"])
    print("copied_text:", captured["text"])
    print("released_on_drop:", captured["released_on_drop"])
    print("click_count:", captured["click_count"])
    print("tab_count:", captured["tab_count"])
    print("screenshot:", str(Path("test-results") / "visual_drag_test.png"))

    if captured["error"] is not None:
        raise SystemExit(1)
    if captured["text"] != "ABC-123":
        raise SystemExit("Không copy đúng nội dung nguồn.")
    if not captured["released_on_drop"]:
        raise SystemExit("Không thả đúng vào điểm đích.")
    if captured["click_count"] != 4:
        raise SystemExit("Khi thấy dấu '-' phải double-click, click thêm 1 lần, rồi nhấn giữ để kéo.")
    if captured["tab_count"] != 1:
        raise SystemExit("Không bấm Tab sau khi thả.")


if __name__ == "__main__":
    main()
