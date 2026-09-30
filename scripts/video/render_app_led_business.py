"""App-led campaign edit. Uses actual browser navigation frames, not recreated UI."""
from functools import lru_cache
from pathlib import Path
import math
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont
from render_business_story import timeline, caption_cues, srt_time, make_audio, STORY

ROOT = Path(__file__).resolve().parents[2]
VIDEO = ROOT / "attached_assets/generated_videos"
FRAMES = VIDEO / "business-app-frames"
IMAGES = ROOT / "attached_assets/generated_images"
OUT = VIDEO / "network-visibility-app-led-business-film-1080p.mp4"
W, H, FPS = 1920, 1080, 12
REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
STILLS = {
    0: "business-film-production.jpg",
    1: "business-film-assortment.jpg",
    14: "business-film-assortment.jpg",
    15: "business-film-outcome.jpg",
}


@lru_cache(maxsize=12)
def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


@lru_cache(maxsize=38)
def source(path):
    with Image.open(path) as image:
        return image.convert("RGB")


def fitting_cover(image, z=1.0):
    width, height = image.size
    scale = max(W / width, H / height) * z
    new_w, new_h = math.ceil(width * scale), math.ceil(height * scale)
    return image.resize((new_w, new_h), Image.Resampling.BICUBIC)


def wrap(draw, text, limit, size, bold=False):
    lines, line = [], ""
    for word in text.split():
        next_line = f"{line} {word}".strip()
        if line and draw.textlength(next_line, font=font(size, bold)) > limit:
            lines.append(line)
            line = word
        else:
            line = next_line
    return lines + ([line] if line else [])


def draw_scene(entry, index, local, total, elapsed, cues, frame_paths):
    art = index in STILLS
    if art:
        source_image = source(IMAGES / STILLS[index])
        zoom = 1.05 + .06 * local / entry["duration"]
        scaled = fitting_cover(source_image, zoom)
        dx = scaled.width - W
        dy = scaled.height - H
        x = int(dx * (.36 + .19 * local / entry["duration"]))
        y = int(dy * (.50 - .11 * local / entry["duration"]))
        image = scaled.crop((x, y, x + W, y + H))
    else:
        files = frame_paths[index]
        position = min(len(files) - 1, int(local / entry["duration"] * len(files)))
        image = source(files[position]).copy()
        if image.size != (W, H):
            image = image.resize((W, H), Image.Resampling.LANCZOS)

    rgba = image.convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shade = ImageDraw.Draw(overlay)
    if art:
        for x in range(0, 1160, 8):
            shade.rectangle((x, 0, x + 8, H), fill=(5, 18, 37, max(0, int(195 * (1 - x / 1160)))))
        shade.rectangle((0, 0, W, 90), fill=(4, 20, 42, 125))
    elif local < 3.0:
        opacity = min(1, local / .35, (3.0 - local) / .7)
        shade.rounded_rectangle((56, 121, 1255, 340), radius=18, fill=(4, 22, 43, int(216 * opacity)))
    shade.rectangle((0, 914, W, H), fill=(4, 17, 35, 205 if art else 215))
    rgba = Image.alpha_composite(rgba, overlay)
    draw = ImageDraw.Draw(rgba)
    if art:
        draw.text((78, 38), "NETWORK VISIBILITY PORTAL", font=font(24, True), fill="#e8f8ff")
        draw.text((87, 355), entry["chapter"].upper(), font=font(29, True), fill="#5ee1e4")
        for line_number, line in enumerate(wrap(draw, entry["title"], 1250, 72, True)[:2]):
            draw.text((82, 415 + line_number * 95), line, font=font(72, True), fill="#ffffff")
        draw.rectangle((87, 662, 194, 668), fill="#5ee1e4")
        draw.text((87, 705), entry["detail"], font=font(27), fill="#e1f2f9")
    elif local < 3.0:
        opacity = min(1, local / .35, (3.0 - local) / .7)
        color = (102, 231, 232, int(255 * opacity))
        text = (255, 255, 255, int(255 * opacity))
        draw.text((91, 151), f"ACTUAL APP  /  {entry['chapter'].upper()}", font=font(24, True), fill=color)
        for j, line in enumerate(wrap(draw, entry["title"], 1080, 47, True)[:2]):
            draw.text((86, 208 + 57 * j), line, font=font(47, True), fill=text)
    if 8 <= index <= 12:
        tag = entry.get("label", "GUIDED DEMO")
        bounds = draw.textbbox((0, 0), tag, font=font(22, True))
        left = W - 66 - (bounds[2] - bounds[0]) - 34
        draw.rounded_rectangle((left, 817, W - 56, 866), radius=12, fill=(4, 27, 53, 230), outline="#eebf72", width=2)
        draw.text((left + 17, 829), tag, font=font(22, True), fill="#ffd085")
    active = next((value for start, end, value in cues if start <= elapsed < end), "")
    for j, line in enumerate(wrap(draw, active, 1780, 36, True)[:2]):
        draw.text((W // 2, 985 + j * 42), line, font=font(36, True), fill="#ffffff", anchor="mm", stroke_width=1, stroke_fill="#051324")
    draw.rectangle((0, 914, round(W * elapsed / total), 919), fill="#4fd7d9")
    return rgba.convert("RGB")


def main():
    entries, total = timeline()
    cues = caption_cues(entries)
    frame_paths = {}
    for index in range(2, 14):
        files = sorted((FRAMES / f"{index:02}-" ).glob("*.jpg"))
        if not files:
            files = sorted(FRAMES.glob(f"{index:02}-*/*.jpg"))
        if not files:
            raise FileNotFoundError(f"Missing actual app navigation scene {index}")
        frame_paths[index] = files
    if total < 120:
        raise RuntimeError(f"Film shorter than two minutes: {total}")
    (VIDEO / "network-visibility-app-led-business-transcript.txt").write_text(
        "Network Visibility Portal — app-led business film transcript\n"
        "Original AI-generated music and imagery; application footage captured from the running app.\n"
        "ATP detail and guided exception examples are deterministic. No live ATP refresh or SAP writes.\n\n"
        + "\n\n".join(
            f"[{e['start']:06.1f}–{e['start']+e['duration']:06.1f}] {e['chapter']} — {e['title']}\n{e['voice']}"
            for e in entries
        ) + "\n"
    )
    (VIDEO / "network-visibility-app-led-business-captions.srt").write_text(
        "\n\n".join(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{text}"
                    for i, (a, b, text) in enumerate(cues, 1)) + "\n"
    )
    contact = Image.new("RGB", (960 * 2, 540 * 8))
    for i, e in enumerate(entries):
        frame = draw_scene(e, i, min(4.2, e["duration"] - .1), total,
                           e["start"] + min(4.2, e["duration"] - .1), cues, frame_paths)
        contact.paste(frame.resize((960, 540)), ((i % 2) * 960, (i // 2) * 540))
    contact.save(VIDEO / "network-visibility-app-led-business-contact.jpg", quality=86)
    if "--contact" in sys.argv:
        print("Contact sheet ready", total)
        return
    # The earlier voice performance is accurate to the live product; this is a new edit.
    import render_business_story as previous
    previous.MUSIC = ROOT / "attached_assets/generated_audio/business-film-score.mp3"
    soundtrack = VIDEO / "network-visibility-app-led-business-audio.m4a"
    make_audio(entries, total, soundtrack)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
            "-i", "pipe:0", "-i", str(soundtrack),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-t", f"{total:.3f}", "-movflags", "+faststart", str(OUT)]
    process = subprocess.Popen(args, stdin=subprocess.PIPE)
    try:
        scene_index = 0
        for n in range(round(total * FPS)):
            t = n / FPS
            while scene_index + 1 < len(entries) and t >= entries[scene_index + 1]["start"]:
                scene_index += 1
            e = entries[scene_index]
            process.stdin.write(draw_scene(e, scene_index, t - e["start"], total, t, cues, frame_paths).tobytes())
            if n % (FPS * 10) == 0:
                print(f"Rendered {t:.0f} / {total:.1f}s", flush=True)
    finally:
        process.stdin.close()
    if process.wait():
        raise RuntimeError("Video encode failed")
    print(OUT, total)


if __name__ == "__main__":
    main()