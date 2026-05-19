import ctypes
import ctypes.wintypes
import queue
import random
import threading
import time
import tkinter as tk
from dataclasses import dataclass
from tkinter import messagebox, ttk

try:
    import pystray
    from PIL import Image, ImageDraw, ImageTk
except ImportError:
    pystray = None
    Image = None
    ImageDraw = None
    ImageTk = None


user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
KEYEVENTF_KEYUP = 0x0002
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
WM_HOTKEY = 0x0312
CF_UNICODETEXT = 13
GMEM_MOVEABLE = 0x0002

user32.GetClipboardData.restype = ctypes.c_void_p
user32.GetClipboardData.argtypes = [ctypes.c_uint]
user32.SetClipboardData.restype = ctypes.c_void_p
user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
user32.OpenClipboard.argtypes = [ctypes.c_void_p]
user32.OpenClipboard.restype = ctypes.c_bool
user32.CloseClipboard.restype = ctypes.c_bool
user32.EmptyClipboard.restype = ctypes.c_bool
kernel32.GlobalAlloc.restype = ctypes.c_void_p
kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
kernel32.GlobalLock.restype = ctypes.c_void_p
kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
kernel32.GlobalUnlock.restype = ctypes.c_bool


VK = {
    "backspace": 0x08,
    "tab": 0x09,
    "enter": 0x0D,
    "shift": 0x10,
    "ctrl": 0x11,
    "alt": 0x12,
    "esc": 0x1B,
    "escape": 0x1B,
    "space": 0x20,
    "left": 0x25,
    "up": 0x26,
    "right": 0x27,
    "down": 0x28,
    "delete": 0x2E,
    "home": 0x24,
    "end": 0x23,
    "pageup": 0x21,
    "pagedown": 0x22,
}

for i in range(1, 13):
    VK[f"f{i}"] = 0x6F + i

for ch in "0123456789":
    VK[ch] = ord(ch)

for ch in "abcdefghijklmnopqrstuvwxyz":
    VK[ch] = ord(ch.upper())


@dataclass
class StepConfig:
    source_points: list[tuple[int, int]]
    target_point: tuple[int, int]
    random_source: bool
    repeat_count: int | None
    cycle_delay: float
    click_count: int
    click_interval: float
    hold_delay: float
    drag_duration: float
    key_name: str
    detect_marker: bool
    marker_text: str
    copy_delay: float


def get_cursor_pos() -> tuple[int, int]:
    point = POINT()
    user32.GetCursorPos(ctypes.byref(point))
    return point.x, point.y


def set_cursor_pos(x: int, y: int) -> None:
    user32.SetCursorPos(int(x), int(y))


def left_down() -> None:
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)


def left_up() -> None:
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


def left_click() -> None:
    left_down()
    time.sleep(0.03)
    left_up()


def press_key(key_name: str) -> None:
    key_name = key_name.strip().lower()
    if not key_name:
        return
    vk = VK.get(key_name)
    if vk is None:
        raise ValueError(f"Phím không hỗ trợ: {key_name}")
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.03)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)


def press_ctrl_c() -> None:
    ctrl = VK["ctrl"]
    c_key = VK["c"]
    user32.keybd_event(ctrl, 0, 0, 0)
    time.sleep(0.02)
    user32.keybd_event(c_key, 0, 0, 0)
    time.sleep(0.03)
    user32.keybd_event(c_key, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.02)
    user32.keybd_event(ctrl, 0, KEYEVENTF_KEYUP, 0)


def get_clipboard_text() -> str | None:
    if not user32.OpenClipboard(None):
        return None
    try:
        handle = user32.GetClipboardData(CF_UNICODETEXT)
        if not handle:
            return None
        pointer = kernel32.GlobalLock(handle)
        if not pointer:
            return None
        try:
            return ctypes.wstring_at(pointer)
        finally:
            kernel32.GlobalUnlock(handle)
    finally:
        user32.CloseClipboard()


def set_clipboard_text(text: str) -> None:
    encoded = text.encode("utf-16-le") + b"\x00\x00"
    handle = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(encoded))
    if not handle:
        return
    pointer = kernel32.GlobalLock(handle)
    if not pointer:
        return
    try:
        ctypes.memmove(pointer, encoded, len(encoded))
    finally:
        kernel32.GlobalUnlock(handle)

    if not user32.OpenClipboard(None):
        return
    try:
        user32.EmptyClipboard()
        user32.SetClipboardData(CF_UNICODETEXT, handle)
    finally:
        user32.CloseClipboard()


def copy_selected_text(copy_delay: float) -> str:
    old_text = get_clipboard_text()
    press_ctrl_c()
    time.sleep(copy_delay)
    copied_text = get_clipboard_text() or ""
    if old_text is not None:
        set_clipboard_text(old_text)
    return copied_text


def create_status_icon(state: str, size: int = 64):
    if Image is None or ImageDraw is None:
        return None

    colors = {
        "brand": ("#111827", "#38bdf8", "#f8fafc"),
        "running": ("#0f172a", "#22c55e", "#f8fafc"),
        "stopped": ("#111827", "#f97316", "#f8fafc"),
    }
    background, accent, foreground = colors.get(state, colors["brand"])
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = max(4, size // 12)
    draw.rounded_rectangle((margin, margin, size - margin, size - margin), radius=size // 5, fill=background)

    if state == "running":
        draw.polygon(
            [
                (size * 0.38, size * 0.28),
                (size * 0.38, size * 0.72),
                (size * 0.72, size * 0.50),
            ],
            fill=accent,
        )
    elif state == "stopped":
        block = size * 0.31
        draw.rounded_rectangle(
            (block, block, size - block, size - block),
            radius=max(2, size // 18),
            fill=accent,
        )
    else:
        draw.ellipse((size * 0.18, size * 0.18, size * 0.82, size * 0.82), outline=accent, width=max(3, size // 12))
        draw.line((size * 0.32, size * 0.46, size * 0.47, size * 0.62, size * 0.72, size * 0.34), fill=foreground, width=max(4, size // 11), joint="curve")

    return image


def parse_hotkey(text: str) -> tuple[int, int]:
    parts = [part.strip().lower() for part in text.replace("+", " ").split() if part.strip()]
    if not parts:
        raise ValueError("Hotkey đang trống")

    modifiers = 0
    key = None
    for part in parts:
        if part in {"ctrl", "control"}:
            modifiers |= MOD_CONTROL
        elif part == "alt":
            modifiers |= MOD_ALT
        elif part == "shift":
            modifiers |= MOD_SHIFT
        else:
            key = part

    if key is None or key not in VK:
        raise ValueError(f"Hotkey không hỗ trợ: {text}")
    return modifiers, VK[key]


class HotkeyListener:
    def __init__(self, app: "AutoClickDragApp") -> None:
        self.app = app
        self.thread: threading.Thread | None = None
        self.thread_id: int | None = None
        self.stop_event = threading.Event()
        self.hotkeys: list[tuple[int, int, int]] = []

    def start(self, start_hotkey: str, stop_hotkey: str) -> None:
        self.stop()
        start_mod, start_vk = parse_hotkey(start_hotkey)
        stop_mod, stop_vk = parse_hotkey(stop_hotkey)
        self.hotkeys = [(1, start_mod, start_vk), (2, stop_mod, stop_vk)]
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._message_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        thread = self.thread
        thread_id = self.thread_id
        if thread_id:
            user32.PostThreadMessageW(thread_id, 0x0012, 0, 0)
        if thread and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=0.5)
        self.thread = None
        self.thread_id = None

    def _message_loop(self) -> None:
        self.thread_id = ctypes.windll.kernel32.GetCurrentThreadId()
        registered_ids: list[int] = []
        for hotkey_id, modifiers, vk in self.hotkeys:
            if user32.RegisterHotKey(None, hotkey_id, modifiers, vk):
                registered_ids.append(hotkey_id)
            else:
                self.app.after(0, self.app.set_status, "Không đăng ký được hotkey. Hãy đổi phím khác.")

        msg = ctypes.wintypes.MSG()
        while not self.stop_event.is_set():
            result = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if result == 0:
                break
            if msg.message == WM_HOTKEY:
                if msg.wParam == 1:
                    self.app.after(0, self.app.toggle_running)
                elif msg.wParam == 2:
                    self.app.after(0, self.app.stop_worker)

        for hotkey_id in registered_ids:
            user32.UnregisterHotKey(None, hotkey_id)


class AutoClickDragApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Auto Click Drag")
        self.geometry("900x700")
        self.minsize(840, 650)

        self.positions: dict[str, tuple[int, int] | None] = {name: None for name in "ABCD"}
        self.target_position: tuple[int, int] | None = None
        self.position_labels: dict[str, tk.StringVar] = {}
        self.source_checks: dict[str, tk.BooleanVar] = {}

        self.worker_thread: threading.Thread | None = None
        self.stop_event = threading.Event()
        self.running = False
        self.app_state = "brand"
        self.closing = False
        self.tray_icon = None
        self.tray_thread: threading.Thread | None = None
        self.tray_images = self._create_tray_images()
        self.photo_icons = self._create_photo_icons()
        self.ui_queue: queue.SimpleQueue = queue.SimpleQueue()
        self.hotkeys = HotkeyListener(self)

        self.configure(background="#eef2f7")
        self._apply_style()
        if self.photo_icons.get("brand") is not None:
            self.iconphoto(True, self.photo_icons["brand"])
        self._build_ui()
        self.apply_hotkeys()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.bind("<Unmap>", self._on_unmap)
        self.after(100, self._process_ui_queue)

    def _create_tray_images(self) -> dict[str, object]:
        return {
            "brand": create_status_icon("brand"),
            "running": create_status_icon("running"),
            "stopped": create_status_icon("stopped"),
        }

    def _create_photo_icons(self) -> dict[str, tk.PhotoImage]:
        if ImageTk is None:
            return {}
        return {
            name: ImageTk.PhotoImage(image)
            for name, image in self.tray_images.items()
            if image is not None
        }

    def _apply_style(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", font=("Segoe UI", 10), background="#eef2f7", foreground="#172033")
        style.configure("App.TFrame", background="#eef2f7")
        style.configure("Header.TFrame", background="#172033")
        style.configure("HeaderTitle.TLabel", background="#172033", foreground="#ffffff", font=("Segoe UI", 18, "bold"))
        style.configure("HeaderText.TLabel", background="#172033", foreground="#cbd5e1")
        style.configure("Panel.TLabelframe", background="#ffffff", bordercolor="#cbd5e1", relief="solid")
        style.configure("Panel.TLabelframe.Label", background="#ffffff", foreground="#0f172a", font=("Segoe UI", 11, "bold"))
        style.configure("TLabel", background="#ffffff", foreground="#172033")
        style.configure("TCheckbutton", background="#ffffff", foreground="#172033")
        style.configure("TRadiobutton", background="#ffffff", foreground="#172033")
        style.configure("TEntry", fieldbackground="#ffffff")
        style.configure("TCombobox", fieldbackground="#ffffff")
        style.configure("Primary.TButton", background="#2563eb", foreground="#ffffff", padding=(14, 8), font=("Segoe UI", 10, "bold"))
        style.map("Primary.TButton", background=[("active", "#1d4ed8"), ("disabled", "#94a3b8")])
        style.configure("Danger.TButton", background="#dc2626", foreground="#ffffff", padding=(14, 8), font=("Segoe UI", 10, "bold"))
        style.map("Danger.TButton", background=[("active", "#b91c1c")])
        style.configure("Soft.TButton", background="#e2e8f0", foreground="#172033", padding=(12, 7))
        style.map("Soft.TButton", background=[("active", "#cbd5e1")])
        style.configure("Status.TLabel", background="#dbeafe", foreground="#1e3a8a", padding=(12, 8), font=("Segoe UI", 10, "bold"))

    def _build_ui(self) -> None:
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = ttk.Frame(self, padding=(18, 14, 18, 12), style="Header.TFrame")
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)

        ttk.Label(header, text="Auto Click Drag", style="HeaderTitle.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(
            header,
            text="F8 chạy/tạm dừng, F9 dừng khẩn cấp. Ứng dụng sẽ điều khiển chuột và phím trên màn hình hiện tại.",
            style="HeaderText.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(4, 0))

        content = ttk.Frame(self, padding=(16, 14, 16, 12), style="App.TFrame")
        content.grid(row=1, column=0, sticky="nsew")
        content.columnconfigure(0, weight=1)
        content.columnconfigure(1, weight=1)
        content.rowconfigure(0, weight=1)

        left = ttk.LabelFrame(content, text="Vị trí thao tác", padding=14, style="Panel.TLabelframe")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        left.columnconfigure(1, weight=1)

        ttk.Label(left, text="Nguồn để double-click và kéo").grid(row=0, column=0, columnspan=4, sticky="w")
        for index, name in enumerate("ABCD", start=1):
            self.source_checks[name] = tk.BooleanVar(value=name == "A")
            self.position_labels[name] = tk.StringVar(value="Chưa đặt")
            ttk.Checkbutton(left, text=name, variable=self.source_checks[name]).grid(row=index, column=0, sticky="w", pady=4)
            ttk.Label(left, textvariable=self.position_labels[name], width=18).grid(row=index, column=1, sticky="w", pady=4)
            ttk.Button(left, text="Lấy sau 3s", command=lambda n=name: self.capture_position(n), style="Soft.TButton").grid(
                row=index, column=2, sticky="ew", padx=(8, 0), pady=4
            )
            ttk.Button(left, text="Lấy ngay", command=lambda n=name: self.capture_position_now(n), style="Soft.TButton").grid(
                row=index, column=3, sticky="ew", padx=(8, 0), pady=4
            )

        ttk.Separator(left).grid(row=5, column=0, columnspan=4, sticky="ew", pady=12)

        self.target_label = tk.StringVar(value="Chưa đặt")
        ttk.Label(left, text="Vị trí thả chuột").grid(row=6, column=0, sticky="w", pady=4)
        ttk.Label(left, textvariable=self.target_label, width=18).grid(row=6, column=1, sticky="w", pady=4)
        ttk.Button(left, text="Lấy sau 3s", command=self.capture_target, style="Soft.TButton").grid(row=6, column=2, sticky="ew", padx=(8, 0), pady=4)
        ttk.Button(left, text="Lấy ngay", command=self.capture_target_now, style="Soft.TButton").grid(row=6, column=3, sticky="ew", padx=(8, 0), pady=4)

        ttk.Label(left, text="Chế độ chọn nguồn").grid(row=7, column=0, sticky="w", pady=(16, 4))
        self.mode_var = tk.StringVar(value="fixed")
        mode_box = ttk.Frame(left)
        mode_box.grid(row=7, column=1, columnspan=3, sticky="w", pady=(16, 4))
        ttk.Radiobutton(mode_box, text="Dùng điểm đầu tiên đã chọn", value="fixed", variable=self.mode_var).grid(row=0, column=0, sticky="w")
        ttk.Radiobutton(mode_box, text="Random trong các điểm đã tick", value="random", variable=self.mode_var).grid(
            row=1, column=0, sticky="w", pady=(6, 0)
        )

        right = ttk.LabelFrame(content, text="Cấu hình chu kỳ", padding=14, style="Panel.TLabelframe")
        right.grid(row=0, column=1, sticky="nsew", padx=(8, 0))
        right.columnconfigure(1, weight=1)

        self.repeat_var = tk.StringVar(value="10")
        self.infinite_var = tk.BooleanVar(value=False)
        self.cycle_delay_var = tk.StringVar(value="1.0")
        self.click_count_var = tk.StringVar(value="2")
        self.click_interval_var = tk.StringVar(value="0.08")
        self.hold_delay_var = tk.StringVar(value="0.10")
        self.drag_duration_var = tk.StringVar(value="0.35")
        self.key_var = tk.StringVar(value="tab")
        self.detect_marker_var = tk.BooleanVar(value=False)
        self.marker_text_var = tk.StringVar(value="-")
        self.copy_delay_var = tk.StringVar(value="0.15")
        self.start_hotkey_var = tk.StringVar(value="F8")
        self.stop_hotkey_var = tk.StringVar(value="F9")

        self._entry_row(right, 0, "Số lần lặp", self.repeat_var)
        ttk.Checkbutton(right, text="Lặp vô hạn", variable=self.infinite_var).grid(row=1, column=1, sticky="w", pady=6)
        self._entry_row(right, 2, "Delay mỗi vòng (giây)", self.cycle_delay_var)
        self._entry_row(right, 3, "Số click tại nguồn", self.click_count_var)
        self._entry_row(right, 4, "Nghỉ giữa click", self.click_interval_var)
        self._entry_row(right, 5, "Nghỉ trước khi kéo", self.hold_delay_var)
        self._entry_row(right, 6, "Thời gian kéo", self.drag_duration_var)

        ttk.Label(right, text="Phím bấm sau khi thả").grid(row=7, column=0, sticky="w", pady=6)
        key_combo = ttk.Combobox(
            right,
            textvariable=self.key_var,
            values=("tab", "enter", "space", "esc", "delete", "left", "right", "up", "down"),
        )
        key_combo.grid(row=7, column=1, sticky="ew", pady=6)

        ttk.Separator(right).grid(row=8, column=0, columnspan=2, sticky="ew", pady=12)
        ttk.Checkbutton(right, text="Nếu nội dung có ký tự này thì click thêm 1 lần", variable=self.detect_marker_var).grid(
            row=9, column=0, columnspan=2, sticky="w", pady=6
        )
        self._entry_row(right, 10, "Ký tự cần nhận diện", self.marker_text_var)
        self._entry_row(right, 11, "Thời gian chờ copy", self.copy_delay_var)

        ttk.Separator(right).grid(row=12, column=0, columnspan=2, sticky="ew", pady=12)
        self._entry_row(right, 13, "Hotkey chạy/tạm dừng", self.start_hotkey_var)
        self._entry_row(right, 14, "Hotkey dừng", self.stop_hotkey_var)
        ttk.Button(right, text="Áp dụng hotkey", command=self.apply_hotkeys, style="Soft.TButton").grid(row=15, column=1, sticky="ew", pady=(6, 0))

        controls = ttk.Frame(self, padding=(16, 0, 16, 14), style="App.TFrame")
        controls.grid(row=2, column=0, sticky="ew")
        controls.columnconfigure(2, weight=1)

        self.start_button = ttk.Button(controls, text="Chạy", command=self.start_worker, style="Primary.TButton")
        self.start_button.grid(row=0, column=0, padx=(0, 8))
        ttk.Button(controls, text="Dừng", command=self.stop_worker, style="Danger.TButton").grid(row=0, column=1, padx=(0, 8))
        ttk.Button(controls, text="Thử 1 vòng", command=self.run_one_cycle, style="Soft.TButton").grid(row=0, column=2, sticky="w")
        ttk.Button(controls, text="Ẩn xuống khay", command=self.hide_to_tray, style="Soft.TButton").grid(row=0, column=3, sticky="w", padx=(8, 0))

        self.status_var = tk.StringVar(value="Sẵn sàng.")
        ttk.Label(controls, textvariable=self.status_var, style="Status.TLabel").grid(row=1, column=0, columnspan=4, sticky="ew", pady=(10, 0))

    def _entry_row(self, parent: ttk.Frame, row: int, label: str, variable: tk.StringVar) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=6)
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=6)

    def set_status(self, text: str) -> None:
        self.status_var.set(text)

    def post_status(self, text: str) -> None:
        try:
            self.after(0, self.set_status, text)
        except RuntimeError:
            pass

    def queue_ui(self, callback, *args) -> None:
        self.ui_queue.put((callback, args))

    def _process_ui_queue(self) -> None:
        if self.closing:
            return
        while True:
            try:
                callback, args = self.ui_queue.get_nowait()
            except queue.Empty:
                break
            callback(*args)
        if not self.closing:
            self.after(100, self._process_ui_queue)

    def set_app_state(self, state: str) -> None:
        self.app_state = state
        photo = self.photo_icons.get(state)
        if photo is not None:
            self.iconphoto(True, photo)
        if self.tray_icon is not None and self.tray_images.get(state) is not None:
            self.tray_icon.icon = self.tray_images[state]
            self.tray_icon.title = self._tray_title()

    def _tray_title(self) -> str:
        labels = {
            "brand": "Auto Click Drag - sẵn sàng",
            "running": "Auto Click Drag - đang chạy",
            "stopped": "Auto Click Drag - đã dừng",
        }
        return labels.get(self.app_state, "Auto Click Drag")

    def ensure_tray_icon(self) -> None:
        if pystray is None or self.tray_images.get("brand") is None:
            self.set_status("Chưa có thư viện system tray. Ứng dụng vẫn chạy trên cửa sổ chính.")
            return
        if self.tray_icon is not None:
            return

        menu = pystray.Menu(
            pystray.MenuItem("Mở cửa sổ", lambda icon, item: self.queue_ui(self.show_window), default=True),
            pystray.MenuItem("Chạy / tạm dừng", lambda icon, item: self.queue_ui(self.toggle_running)),
            pystray.MenuItem("Dừng", lambda icon, item: self.queue_ui(self.stop_worker)),
            pystray.MenuItem("Thoát", lambda icon, item: self.queue_ui(self.exit_app)),
        )
        self.tray_icon = pystray.Icon("AutoClickDrag", self.tray_images.get(self.app_state) or self.tray_images["brand"], self._tray_title(), menu)
        self.tray_thread = threading.Thread(target=self.tray_icon.run, daemon=True)
        self.tray_thread.start()

    def hide_to_tray(self) -> None:
        self.ensure_tray_icon()
        self.withdraw()
        self.set_status("Đang chạy nền ở khay hệ thống.")

    def show_window(self) -> None:
        self.deiconify()
        self.lift()
        self.focus_force()

    def _on_unmap(self, event) -> None:
        if event.widget is self and self.state() == "iconic":
            self.after(0, self.hide_to_tray)

    def capture_position(self, name: str) -> None:
        self._countdown_capture(lambda: self.capture_position_now(name), f"Đặt chuột vào điểm {name}")

    def capture_target(self) -> None:
        self._countdown_capture(self.capture_target_now, "Đặt chuột vào vị trí thả")

    def _countdown_capture(self, callback, prefix: str, seconds: int = 3) -> None:
        def tick(left: int) -> None:
            if left <= 0:
                callback()
                return
            self.set_status(f"{prefix}. Lấy vị trí sau {left}s...")
            self.after(1000, tick, left - 1)

        tick(seconds)

    def capture_position_now(self, name: str) -> None:
        self.positions[name] = get_cursor_pos()
        self.position_labels[name].set(self._format_point(self.positions[name]))
        self.set_status(f"Đã lưu điểm {name}: {self._format_point(self.positions[name])}")

    def capture_target_now(self) -> None:
        self.target_position = get_cursor_pos()
        self.target_label.set(self._format_point(self.target_position))
        self.set_status(f"Đã lưu vị trí thả: {self._format_point(self.target_position)}")

    def apply_hotkeys(self) -> None:
        try:
            self.hotkeys.start(self.start_hotkey_var.get(), self.stop_hotkey_var.get())
        except ValueError as exc:
            messagebox.showerror("Hotkey không hợp lệ", str(exc))
            return
        self.set_status(f"Hotkey đang dùng: {self.start_hotkey_var.get()} chạy/tạm dừng, {self.stop_hotkey_var.get()} dừng.")

    def toggle_running(self) -> None:
        if self.running:
            self.stop_worker()
        else:
            self.start_worker()

    def start_worker(self) -> None:
        if self.running:
            return
        try:
            config = self.read_config()
        except ValueError as exc:
            messagebox.showerror("Cấu hình chưa đúng", str(exc))
            return

        self.stop_event.clear()
        self.running = True
        self.set_app_state("running")
        self.start_button.configure(text="Đang chạy")
        self.worker_thread = threading.Thread(target=self._run_loop, args=(config,), daemon=True)
        self.worker_thread.start()
        self.set_status("Đang chạy. Bấm F9 để dừng.")

    def run_one_cycle(self) -> None:
        if self.running:
            return
        try:
            config = self.read_config()
        except ValueError as exc:
            messagebox.showerror("Cấu hình chưa đúng", str(exc))
            return
        config.repeat_count = 1
        config.cycle_delay = 0
        self.stop_event.clear()
        self.running = True
        self.set_app_state("running")
        self.start_button.configure(text="Đang chạy")
        self.worker_thread = threading.Thread(target=self._run_loop, args=(config,), daemon=True)
        self.worker_thread.start()

    def stop_worker(self) -> None:
        self.stop_event.set()
        left_up()
        self.running = False
        self.set_app_state("stopped")
        self.start_button.configure(text="Chạy")
        self.set_status("Đã dừng.")

    def read_config(self) -> StepConfig:
        selected = [self.positions[name] for name in "ABCD" if self.source_checks[name].get() and self.positions[name] is not None]
        if not selected:
            raise ValueError("Hãy tick và lưu ít nhất 1 điểm nguồn A/B/C/D.")
        if self.target_position is None:
            raise ValueError("Hãy lưu vị trí thả chuột.")
        if self.detect_marker_var.get() and not self.marker_text_var.get():
            raise ValueError("Hãy nhập ký tự cần nhận diện.")

        repeat_count = None if self.infinite_var.get() else self._read_int(self.repeat_var.get(), "Số lần lặp", minimum=1)
        return StepConfig(
            source_points=selected,
            target_point=self.target_position,
            random_source=self.mode_var.get() == "random",
            repeat_count=repeat_count,
            cycle_delay=self._read_float(self.cycle_delay_var.get(), "Delay mỗi vòng", minimum=0),
            click_count=self._read_int(self.click_count_var.get(), "Số click", minimum=1),
            click_interval=self._read_float(self.click_interval_var.get(), "Nghỉ giữa click", minimum=0),
            hold_delay=self._read_float(self.hold_delay_var.get(), "Nghỉ trước khi kéo", minimum=0),
            drag_duration=self._read_float(self.drag_duration_var.get(), "Thời gian kéo", minimum=0.01),
            key_name=self.key_var.get(),
            detect_marker=self.detect_marker_var.get(),
            marker_text=self.marker_text_var.get(),
            copy_delay=self._read_float(self.copy_delay_var.get(), "Thời gian chờ copy", minimum=0),
        )

    def _run_loop(self, config: StepConfig) -> None:
        completed = 0
        try:
            while not self.stop_event.is_set():
                if config.repeat_count is not None and completed >= config.repeat_count:
                    break
                self._run_cycle(config)
                completed += 1
                self.post_status(f"Đã chạy {completed} vòng.")
                self._sleep_interruptible(config.cycle_delay)
        except Exception as exc:
            self.after(0, messagebox.showerror, "Lỗi khi chạy", str(exc))
        finally:
            left_up()
            self.running = False
            self.after(0, self.set_app_state, "stopped")
            self.after(0, self.start_button.configure, {"text": "Chạy"})
            self.post_status(f"Hoàn tất/dừng sau {completed} vòng.")

    def _run_cycle(self, config: StepConfig) -> None:
        source = random.choice(config.source_points) if config.random_source else config.source_points[0]
        target = config.target_point
        clicks_to_drag = max(1, config.click_count)

        set_cursor_pos(*source)
        self._sleep_interruptible(0.05)
        for _ in range(clicks_to_drag - 1):
            if self.stop_event.is_set():
                return
            left_click()
            self._sleep_interruptible(config.click_interval)

        if self.stop_event.is_set():
            return

        set_cursor_pos(*source)
        left_down()
        self._sleep_interruptible(config.hold_delay)

        if config.detect_marker and not self.stop_event.is_set():
            selected_text = copy_selected_text(config.copy_delay)
            if config.marker_text in selected_text:
                left_up()
                self._sleep_interruptible(config.click_interval)
                set_cursor_pos(*source)
                left_down()
                self._sleep_interruptible(config.hold_delay)
                self.post_status(f"Đã thấy '{config.marker_text}', chuyển sang click thứ 3 để kéo.")

        if self.stop_event.is_set():
            left_up()
            return

        self._drag_to(source, target, config.drag_duration)
        left_up()
        self._sleep_interruptible(0.05)
        press_key(config.key_name)

    def _drag_to(self, source: tuple[int, int], target: tuple[int, int], duration: float) -> None:
        steps = max(8, int(duration / 0.01))
        x1, y1 = source
        x2, y2 = target
        for step in range(1, steps + 1):
            if self.stop_event.is_set():
                return
            ratio = step / steps
            x = round(x1 + (x2 - x1) * ratio)
            y = round(y1 + (y2 - y1) * ratio)
            set_cursor_pos(x, y)
            time.sleep(duration / steps)

    def _sleep_interruptible(self, seconds: float) -> None:
        end = time.monotonic() + seconds
        while time.monotonic() < end and not self.stop_event.is_set():
            time.sleep(min(0.03, end - time.monotonic()))

    def _read_int(self, value: str, label: str, minimum: int) -> int:
        try:
            parsed = int(value.strip())
        except ValueError as exc:
            raise ValueError(f"{label} phải là số nguyên.") from exc
        if parsed < minimum:
            raise ValueError(f"{label} phải >= {minimum}.")
        return parsed

    def _read_float(self, value: str, label: str, minimum: float) -> float:
        try:
            parsed = float(value.strip().replace(",", "."))
        except ValueError as exc:
            raise ValueError(f"{label} phải là số.") from exc
        if parsed < minimum:
            raise ValueError(f"{label} phải >= {minimum}.")
        return parsed

    def _format_point(self, point: tuple[int, int] | None) -> str:
        if point is None:
            return "Chưa đặt"
        return f"x={point[0]}, y={point[1]}"

    def on_close(self) -> None:
        self.closing = True
        self.stop_worker()
        self.hotkeys.stop()
        if self.tray_icon is not None:
            self.tray_icon.stop()
            self.tray_icon = None
        self.destroy()

    def exit_app(self) -> None:
        self.on_close()


if __name__ == "__main__":
    AutoClickDragApp().mainloop()
