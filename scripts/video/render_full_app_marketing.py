"""Render a motion-led, 40-second overview of the Network Visibility Portal.

Uses genuine, non-destructive UI captures as small proof points. The illustrated
flows describe application concepts, not a simulation of live processing.
"""

from functools import lru_cache
from pathlib import Path
import math
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / "attached_assets/generated_videos/full-app-source-frames"
OUTPUT = ROOT / "attached_assets/generated_videos/full-app-marketing-video-720p.mp4"
AUDIO = ROOT / "attached_assets/generated_audio/ccr-marketing-music.mp3"
W, H, FPS, DURATION = 1280, 720, 24, 40

WHITE = "#f4f8ff"
MUTED = "#9aafcb"
BLUE = "#4d96ff"
CYAN = "#46d9e7"
GREEN = "#54e6ae"
AMBER = "#ffcb72"
CARD = "#112745"
LINE = "#31506f"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ITALIC = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def clamp(value, lo=0, hi=1):
    return max(lo, min(hi, value))


def smooth(value):
    value = clamp(value)
    return value * value * (3 - 2 * value)


def stage(time, start, duration=0.7):
    return smooth((time - start) / duration)


@lru_cache(maxsize=40)
def font(size, style="regular"):
    return ImageFont.truetype({"regular": FONT, "bold": BOLD, "italic": ITALIC}[style], size)


def text(draw, x, y, value, size=22, color=WHITE, style="regular", anchor=None):
    draw.text((int(x), int(y)), value, fill=color, font=font(size, style), anchor=anchor)


def box(draw, xy, fill=CARD, outline=LINE, radius=20, width=1):
    draw.rounded_rectangle(tuple(map(int, xy)), radius=radius, fill=fill, outline=outline, width=width)


def chip(draw, x, y, title, accent=CYAN, active=True, size=15):
    tw = draw.textlength(title, font=font(size, "bold"))
    width = int(tw + 33)
    box(draw, (x, y, x + width, y + 34),
        "#163750" if active else "#13283e",
        accent if active else "#36536c", 12)
    text(draw, x + 16, y + 8, title, size, WHITE if active else MUTED, "bold")
    return width


def line(draw, coords, color=LINE, width=2):
    draw.line(coords, fill=color, width=width, joint="curve")


def light(draw, x, y, color=CYAN, radius=7):
    for r, c in ((radius * 3, "#16445d"), (radius * 2, "#207c94"), (radius, color)):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=c)


def panel(draw, x, y, w, h, accent=CYAN):
    box(draw, (x, y, x + w, y + h), fill=CARD, outline="#375673", radius=22, width=2)
    draw.rounded_rectangle((x + 14, y + 15, x + 19, y + h - 15), radius=3, fill=accent)


def base_image():
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            glow1 = max(0, 1 - math.hypot((x - 1070) / 800, (y - 60) / 650)) ** 3
            glow2 = max(0, 1 - math.hypot((x - 85) / 680, (y - 780) / 580)) ** 3
            px[x, y] = (
                int(7 + 9 * glow1 + 4 * glow2),
                int(18 + 23 * glow1 + 15 * glow2),
                int(38 + 37 * glow1 + 25 * glow2),
            )
    d = ImageDraw.Draw(img)
    for x in range(36, W, 48):
        for y in range(40, H, 48):
            d.ellipse((x, y, x + 1, y + 1), fill="#243950")
    return img


BG = base_image()


def chrome(draw, time, scene, label):
    text(draw, 62, 30, "Unilever", 25, WHITE, "italic")
    line(draw, (210, 32, 210, 61), "#50708d", 1)
    text(draw, 228, 35, "NETWORK VISIBILITY PORTAL", 14, MUTED, "bold")
    text(draw, 1207, 35, label, 15, CYAN, "bold", "ra")
    line(draw, (62, 83, 1218, 83), "#29455e", 1)
    line(draw, (62, 680, 1218, 680), "#29455e", 1)
    # This fine progress bar also provides visible motion in quieter beats.
    line(draw, (62, 680, 62 + 1156 * time / DURATION, 680), CYAN, 3)
    text(draw, 62, 690, "NETWORK PLANNING   /   PAID BIBLE   /   CCR", 10, "#728aa9", "bold")
    text(draw, 1217, 691, scene, 10, "#728aa9", "bold", "ra")


@lru_cache(maxsize=3)
def footage(name):
    images = []
    for path in sorted((FRAMES / f"marketing-{name}").glob("*.jpg")):
        with Image.open(path) as raw:
            image = raw.crop((0, 0, 1070, 615)).resize((432, 248), Image.Resampling.LANCZOS)
            images.append(image.copy())
    if not images:
        raise FileNotFoundError(f"No UI capture for {name}")
    return images


def ui_proof(img, draw, name, x, y, local, caption):
    if local > 2.6:
        return
    reveal = stage(local, 0, 0.5)
    if reveal <= 0:
        return
    exit_progress = stage(local, 2.15, 0.45)
    xx = int(x + (1 - reveal) * 70 + exit_progress * 480)
    yy = int(y)
    # Window treatment: a small, subordinate glimpse into the actual app.
    box(draw, (xx - 11, yy - 42, xx + 443, yy + 262), "#193651", "#4786a1", 18, 2)
    draw.ellipse((xx + 5, yy - 27, xx + 13, yy - 19), fill="#fe7a83")
    draw.ellipse((xx + 19, yy - 27, xx + 27, yy - 19), fill="#ffc870")
    draw.ellipse((xx + 33, yy - 27, xx + 41, yy - 19), fill="#59dfba")
    text(draw, xx + 302, yy - 28, "PRODUCT VIEW", 11, "#8cb8cb", "bold")
    shot = footage(name)[min(int(local * 12), len(footage(name)) - 1)]
    img.paste(shot, (xx, yy))
    text(draw, xx, yy + 272, caption, 15, MUTED, "bold")


def intro(img, draw, t):
    chrome(draw, t, "OPENING", "00 / 03")
    reveal = stage(t, 0.3, 0.7)
    text(draw, 70 - (1 - reveal) * 70, 167, "ONE PRODUCT CHANGE.", 61, WHITE, "bold")
    text(draw, 70 - (1 - stage(t, 0.7)) * 70, 244, "MANY MOVING PARTS.", 51, CYAN, "bold")
    if t > 1.5:
        text(draw, 74, 363, "A relaunch can affect the network, the listing,", 24, MUTED)
        text(draw, 74, 402, "and the customer code behind it.", 24, MUTED)
    cx, cy = 1070, 345
    if t > 1.1:
        for j, (tx, ty, label, color) in enumerate([
            (1120, 181, "NETWORK", BLUE), (835, 505, "ASSORTMENT", CYAN),
            (1160, 532, "CUSTOMER", GREEN),
        ]):
            p = stage(t, 1.4 + j * 0.38, 0.85)
            ex, ey = cx + (tx - cx) * p, cy + (ty - cy) * p
            line(draw, (cx, cy, ex, ey), color, 2)
            if p > 0.8:
                light(draw, tx, ty, color, 5)
                text(draw, tx, ty + 23, label, 13, color, "bold", "mt")
            if p > 0:
                light(draw, cx + (ex - cx) * ((t * 0.55) % 1), cy + (ey - cy) * ((t * 0.55) % 1), color, 3)
        light(draw, cx, cy, WHITE, 10)
        text(draw, cx, cy + 34, "CBU CHANGE", 17, WHITE, "bold", "mt")
    if t > 4.1:
        chip(draw, 73, 560, "ONE CONNECTED STORY", CYAN)


def network(img, draw, t):
    chrome(draw, t + 5, "NETWORK PLANNING", "01 / 03")
    text(draw, 73, 113, "01   NETWORK PLANNING", 17, BLUE, "bold")
    text(draw, 73, 153, "Track the change", 52, WHITE, "bold")
    text(draw, 73, 217, "through every stage.", 52, WHITE, "bold")
    text(draw, 76, 300, "A CBU's status carries network visibility forward.", 21, MUTED)

    # The line represents tracked stages, not automatic transitions.
    labels = ["Draft", "Active", "Pricing", "Production", "FTR", "Stock", "Transition"]
    xs = [112 + i * 174 for i in range(7)]
    line(draw, (xs[0], 444, xs[-1], 444), "#305075", 5)
    progress = stage(t, 0.8, 6.5) * 6
    current = int(progress)
    if progress > 0:
        ix = min(current, 5)
        line(draw, (xs[0], 444, xs[ix] + (progress - ix) * (xs[ix + 1] - xs[ix]), 444), CYAN, 5)
        light(draw, xs[0] + progress * 174, 444, WHITE, 5)
    for i, (x, label) in enumerate(zip(xs, labels)):
        active = progress >= i
        draw.ellipse((x - 13, 431, x + 13, 457), fill=CYAN if active else "#264767", outline=WHITE if active else "#406582", width=2)
        text(draw, x, 479, label, 15, WHITE if active else MUTED, "bold", "mt")
    if t > 3:
        for i, (label, color) in enumerate([("Lifecycle status", BLUE), ("Sourcing context", CYAN), ("Distribution scope", GREEN)]):
            chip(draw, 86 + i * 260, 555, label, color, True, 14)
    if t > 6.0:
        ui_proof(img, draw, "network", 758, 117, t - 6.0, "Actual Network Planning view")
    # A caption remains visible even when the proof point has left.


def paid(img, draw, t):
    chrome(draw, t + 16, "PAID BIBLE", "02 / 03")
    text(draw, 73, 113, "02   PAID BIBLE", 17, CYAN, "bold")
    text(draw, 73, 153, "One basepack.", 52, WHITE, "bold")
    text(draw, 73, 217, "Many connected decisions.", 46, WHITE, "bold")
    text(draw, 76, 293, "Materials, geography, channels and readiness — in context.", 19, MUTED)
    # The same source branches into listing attributes and review signals.
    panel(draw, 73, 355, 222, 113, BLUE)
    text(draw, 104, 375, "BASEPACK", 13, BLUE, "bold")
    text(draw, 104, 406, "Material set", 22, WHITE, "bold")
    light(draw, 316, 412, CYAN, 5)
    for i, (name, color) in enumerate([("GEOGRAPHY", BLUE), ("CHANNELS", CYAN), ("MSTN STATUS", GREEN), ("PRICE STATUS", AMBER)]):
        x = 407 + (i % 2) * 232
        y = 344 + (i // 2) * 118
        p = stage(t, 1.0 + i * 0.45, 0.75)
        line(draw, (316, 412, x - 16, y + 41), "#315675", 2)
        if p > 0:
            travel_x = 316 + (x - 332) * p
            travel_y = 412 + (y + 41 - 412) * p
            light(draw, travel_x, travel_y, color, 3)
        panel(draw, x, y, 212, 82, color if p > 0.8 else LINE)
        text(draw, x + 30, y + 15, name, 13, color, "bold")
        text(draw, x + 30, y + 42, "Visible" if i < 2 else "Check / review", 17, WHITE, "bold")
    if t > 5.2:
        line(draw, (850, 412, 1015, 412), CYAN, 3)
        light(draw, 850 + 165 * stage(t, 5.2, 1.1), 412, WHITE, 5)
        panel(draw, 1004, 355, 210, 113, GREEN)
        text(draw, 1031, 375, "SERVICE REQUEST", 13, GREEN, "bold")
        text(draw, 1031, 406, "Review path", 21, WHITE, "bold")
    text(draw, 77, 587, "Assortment with the context to review the next action.", 21, MUTED)
    if t > 7.2:
        ui_proof(img, draw, "paid-bible", 806, 85, t - 7.2, "Actual Paid Bible view")


def ccr(img, draw, t):
    chrome(draw, t + 27, "CCR", "03 / 03")
    text(draw, 73, 113, "03   CUSTOMER CODE REPLACEMENT", 17, GREEN, "bold")
    text(draw, 73, 153, "Carry the relaunch", 52, WHITE, "bold")
    text(draw, 73, 217, "through to the customer.", 47, WHITE, "bold")
    text(draw, 76, 292, "Predecessor to successor. Chain by chain. Status by status.", 19, MUTED)
    panel(draw, 75, 352, 225, 100, "#8e9dc0")
    text(draw, 103, 370, "PREDECESSOR CBU", 13, MUTED, "bold")
    text(draw, 103, 401, "Existing CIC", 22, WHITE, "bold")
    line(draw, (300, 402, 378, 402), "#386482", 3)
    light(draw, 300 + stage(t, 0.8, 1.2) * 78, 402, CYAN, 5)
    panel(draw, 379, 352, 234, 100, GREEN)
    text(draw, 407, 370, "SUCCESSOR CBU", 13, GREEN, "bold")
    text(draw, 407, 401, "CCR mapping", 22, WHITE, "bold")
    text(draw, 709, 307, "POSSIBLE ACTIONS  /  WHEN APPLICABLE", 12, MUTED, "bold")
    for i, (label, desc, accent) in enumerate([
        ("01", "New CIC", GREEN), ("02", "Content update", CYAN), ("03", "Rundown", AMBER),
    ]):
        x, y = 708, 337 + i * 96
        p = stage(t, 2.1 + i * 0.55, 0.7)
        line(draw, (613, 402, 690, y + 37), "#345779", 2)
        if p > 0:
            light(draw, 613 + p * 77, 402 + p * (y + 37 - 402), accent, 3)
        panel(draw, x, y, 280, 74, accent)
        text(draw, x + 32, y + 17, label, 14, accent, "bold")
        text(draw, x + 75, y + 15, desc, 20, WHITE, "bold")
    if t > 5.0:
        text(draw, 74, 522, "SAP UPDATE TRACKING", 14, GREEN, "bold")
        chip(draw, 76, 555, "Requested", BLUE, True, 15)
        text(draw, 235, 561, "→", 23, CYAN, "bold")
        chip(draw, 283, 555, "Validated / Posted", GREEN, True, 15)
        text(draw, 531, 562, "or", 16, MUTED)
        chip(draw, 571, 555, "Error returned", AMBER, True, 15)
    if t > 6.1:
        ui_proof(img, draw, "ccr", 765, 98, t - 6.1, "Actual CCR Master Maintenance view")


def outro(img, draw, t):
    chrome(draw, t + 37, "CLOSING", "●")
    cx, cy = 640, 256
    for i, (x, y, color, name) in enumerate([
        (259, 289, BLUE, "NETWORK PLANNING"),
        (640, 390, CYAN, "PAID BIBLE"),
        (1021, 289, GREEN, "CCR"),
    ]):
        p = stage(t, i * 0.24, 0.8)
        line(draw, (x, y, cx + (x - cx) * (1 - p), cy + (y - cy) * (1 - p)), color, 2)
        light(draw, x, y, color, 6)
        text(draw, x, y + 27, name, 14, color, "bold", "mt")
    light(draw, cx, cy, WHITE, 9)
    text(draw, 640, 443, "Change, connected.", 60, WHITE, "bold", "mt")
    text(draw, 640, 534, "Unilever  /  Network Visibility Portal", 23, CYAN, "bold", "mt")
    text(draw, 640, 590, "Admin Center supports reference data and access", 17, MUTED, "regular", "mt")


def render(time):
    image = BG.copy()
    draw = ImageDraw.Draw(image)
    # A subtle ambient sweep keeps the background from becoming static.
    x = int(175 + 940 * ((time * 0.035) % 1))
    line(draw, (x, 90, x + 120, 665), "#142e4e", 1)
    if time < 5:
        intro(image, draw, time)
    elif time < 16:
        network(image, draw, time - 5)
    elif time < 27:
        paid(image, draw, time - 16)
    elif time < 37:
        ccr(image, draw, time - 27)
    else:
        outro(image, draw, time - 37)
    return image


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == "--contact":
        times = [1.9, 7.5, 13.4, 18.4, 24.6, 29.4, 34.2, 38.6]
        contact = Image.new("RGB", (640 * 2, 360 * 4))
        for i, time in enumerate(times):
            contact.paste(render(time).resize((640, 360)), ((i % 2) * 640, (i // 2) * 360))
        path = OUTPUT.with_name("full-app-contact-sheet.jpg")
        contact.save(path, quality=88)
        print(path)
        return
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
        "-i", "pipe:0", "-i", str(AUDIO),
        "-filter:a", "volume=0.55,afade=t=in:st=0:d=0.8,afade=t=out:st=38:d=2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-t", str(DURATION), "-movflags", "+faststart",
        str(OUTPUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in range(FPS * DURATION):
            process.stdin.write(render(frame / FPS).tobytes())
            if frame % (FPS * 5) == 0:
                print(f"{frame / FPS:.0f}/{DURATION}s", flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg failed to encode the video")
    print(OUTPUT)


if __name__ == "__main__":
    main()