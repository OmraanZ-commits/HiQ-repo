"""Render the narrated, current-behavior business story at full HD.

All screen captures are brief proof from the app. The ATP diagrams explicitly
separate the actual JSON export from deterministic demonstration logic.
"""
import json
import math
from pathlib import Path
import subprocess
import sys
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
STORY = json.loads((Path(__file__).with_name("business_story.json")).read_text())
OUT = ROOT / "attached_assets/generated_videos/network-visibility-business-story-1080p.mp4"
AUDIO_DIR = ROOT / "attached_assets/generated_audio"
FRAMES = ROOT / "attached_assets/generated_videos/full-app-source-frames"
MUSIC = AUDIO_DIR / "full-app-business-bed.mp3"
W, H, FPS = 1920, 1080, 15
SPEECH_TEMPO = 1.35
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
INK, CYAN, GREEN, GOLD = "#edf6ff", "#57dcea", "#66e5b8", "#ffc679"
MUTED = "#a8bfd4"
PROOF = {2: "network", 5: "paid-bible", 7: "ccr"}


def probe(path):
    result = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True
    )
    return float(result.strip())


def timeline():
    entries = []
    cursor = 0.
    for i, scene in enumerate(STORY):
        speech = AUDIO_DIR / f"business-voice-{i + 1:02}.mp3"
        if not speech.exists():
            raise FileNotFoundError(speech)
        voice_duration = probe(speech)
        # Give each voice cue a short pre-roll and an unhurried trailing pause.
        duration = max(7.25, voice_duration / SPEECH_TEMPO + .8)
        entries.append({**scene, "start": cursor, "duration": duration,
                        "speech": str(speech), "speech_duration": voice_duration})
        cursor += duration
    return entries, cursor


def caption_cues(entries):
    cues = []
    for entry in entries:
        words = entry["voice"].split()
        count = max(2, math.ceil(len(words) / 11))
        spoken = entry["speech_duration"] / SPEECH_TEMPO
        for part in range(count):
            a = round(part * len(words) / count)
            b = round((part + 1) * len(words) / count)
            start = entry["start"] + .27 + spoken * a / len(words)
            end = entry["start"] + .27 + spoken * b / len(words)
            cues.append((start, end, " ".join(words[a:b])))
    return cues


def srt_time(t):
    milliseconds = round(t * 1000)
    hours, rem = divmod(milliseconds, 3600000)
    minutes, rem = divmod(rem, 60000)
    seconds, ms = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{ms:03}"


@lru_cache(maxsize=40)
def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def label(draw, xy, value, size=28, color=INK, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def rounded(draw, rect, fill, outline=None, radius=22, width=2):
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)


def wrap(draw, message, max_width, size, bold=False):
    lines, current = [], ""
    for word in message.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textlength(candidate, font=font(size, bold)) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def background():
    im = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(im)
    for y in range(H):
        p = y / H
        draw.line((0, y, W, y), fill=(int(8 + p * 5), int(24 + p * 10), int(48 + p * 13)))
    for x in range(80, W, 80):
        draw.line((x, 110, x, 920), fill="#132f49", width=1)
    for y in range(140, 950, 80):
        draw.line((40, y, 1880, y), fill="#132f49", width=1)
    return im


BG = background()


@lru_cache(maxsize=3)
def proof_frame(name):
    source = next((FRAMES / f"marketing-{name}").glob("*.jpg"))
    with Image.open(source) as image:
        return image.crop((0, 0, 1280, 685)).resize((550, 294), Image.Resampling.LANCZOS).copy()


def draw_diagram(draw, scene, index, local):
    nodes = scene["nodes"]
    count = len(nodes)
    left, right = 96, 1818
    spacing = (right - left) / count
    cy = 565
    centers = []
    for n, name in enumerate(nodes):
        cx = int(left + spacing * (n + .5))
        centers.append(cx)
        active = local > .7 + n * .55
        w = int(min(spacing - 27, 365))
        fill = "#153650" if active else "#10293e"
        border = CYAN if active else "#315269"
        rounded(draw, (cx - w // 2, cy - 84, cx + w // 2, cy + 84),
                fill, border, 22, 3 if active else 2)
        label(draw, (cx - w // 2 + 23, cy - 58), f"{n+1:02d}", 22, GOLD if active else MUTED, True)
        words = wrap(draw, name, w - 36, 25, True)
        for line_num, line in enumerate(words[:2]):
            label(draw, (cx, cy - (len(words[:2]) - 1) * 18 + 12 + line_num * 36),
                  line, 25, INK if active else MUTED, True, "mm")
        if active:
            draw.ellipse((cx - 7, cy + 92, cx + 7, cy + 106), fill=GREEN)
    for n in range(count - 1):
        x1 = centers[n] + min(spacing - 27, 365) / 2 + 5
        x2 = centers[n + 1] - min(spacing - 27, 365) / 2 - 5
        if x2 > x1:
            draw.line((int(x1), cy, int(x2), cy), fill="#3b7186", width=4)
            progress = (local * .7 - n * .32) % 1
            dot_x = int(x1 + (x2 - x1) * progress)
            draw.ellipse((dot_x - 8, cy - 8, dot_x + 8, cy + 8), fill=CYAN)
    if 8 <= index <= 12:
        draw_atp_detail(draw, index, local)


def draw_atp_detail(draw, index, local):
    """A distinct, animated data explanation for each ATP beat."""
    rounded(draw, (103, 700, 1817, 856), "#102c43", "#397489", 16)
    reveal = min(1, max(0, (local - 2.0) / 1.6))
    if index == 8:
        label(draw, (140, 725), "OUTPUT RECORD", 19, CYAN, True)
        label(draw, (140, 766), "{ customerChain, successorCbu, depots }", 29, INK, True)
        label(draw, (140, 810), "browser download", 21, MUTED)
        label(draw, (850, 756), "→", 53, CYAN, True)
        label(draw, (1030, 728), "ATP PAYLOAD .JSON", 30, GREEN, True)
        label(draw, (1030, 785), "Last run: local browser timestamp", 23, MUTED)
        label(draw, (1685, 816), "NO LIVE FETCH", 21, GOLD, True, "ra")
    elif index == 9:
        label(draw, (140, 730), "ILLUSTRATIVE BATCH", 20, CYAN, True)
        label(draw, (140, 782), "Stock age  ≤  valid days", 29, INK, True)
        label(draw, (665, 782), "+", 30, GOLD, True)
        label(draw, (740, 782), "valid price", 29, INK, True)
        label(draw, (1060, 782), "→", 45, CYAN, True)
        label(draw, (1170, 782), "usable example ATP", 29, GREEN, True)
        draw.rounded_rectangle((140, 829, 140 + int(1510 * reveal), 836), radius=3, fill=GREEN)
    elif index == 10:
        labels = [("CLASSIFIED?", CYAN), ("RULE MATCH?", CYAN),
                  ("NEW CIC / RUNDOWN?", GOLD), ("STOP OR CONTINUE", GREEN)]
        for k, (name, color) in enumerate(labels):
            x = 145 + 420*k
            rounded(draw, (x, 748, x+365, 811), "#17384e", color, 9)
            label(draw, (x+182, 781), name, 21, INK, True, "mm")
            if k < 3:
                label(draw, (x+385, 782), "›", 38, color, True)
        label(draw, (144, 826), "Missing classification or a manual gate prevents a mapping proposal.", 21, MUTED)
    elif index == 11:
        label(draw, (145, 730), "CANDIDATE COMPARISON · DUMMY VALUES", 19, CYAN, True)
        for k, (name, pct, color) in enumerate([
            ("successor", .58, GREEN), ("alternate", .79, GOLD)
        ]):
            y = 765 + k * 43
            label(draw, (145, y), name.upper(), 20, INK, True)
            rounded(draw, (355, y, 1250, y+22), "#25445a", radius=8)
            rounded(draw, (355, y, 355+int(895*pct*reveal), y+22), color, radius=8)
        rounded(draw, (1325, 750, 1755, 828), "#3e2f2b", GOLD, 12)
        label(draw, (1540, 780), "DEPOT ELIGIBILITY FIRST", 20, GOLD, True, "mm")
    else:
        outcomes = ["RETAIN", "SWITCH", "DEFER", "ESCALATE"]
        for k, name in enumerate(outcomes):
            x = 140+k*355
            rounded(draw, (x, 747, x+316, 806), "#173b50", CYAN if k < 2 else GOLD, 12)
            label(draw, (x+158, 778), name, 21, INK, True, "mm")
        label(draw, (1610, 778), "→", 35, CYAN, True)
        label(draw, (1765, 778), "REVIEW", 24, GREEN, True, "rm")
        label(draw, (145, 825), "A proposal, not a write to CCR or SAP.", 22, MUTED)


def draw_proof(image, draw, scene, index, local):
    if index not in PROOF or local < 3.2:
        return
    # Short authentic UI proof; never a full-screen slideshow.
    slide = min(1, (local - 3.2) / .6)
    x = int(1265 + (1 - slide) * 610)
    y = 667
    rounded(draw, (x - 14, y - 47, x + 565, y + 308), "#21425d", "#60b5be", 16, 3)
    label(draw, (x + 8, y - 37), "ACTUAL APP VIEW", 17, CYAN, True)
    image.paste(proof_frame(PROOF[index]), (x, y))


def frame(entry, index, local, total, elapsed, cues=None):
    image = BG.copy()
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 102), fill="#0a243c")
    label(draw, (91, 32), "NETWORK VISIBILITY PORTAL", 26, INK, True)
    label(draw, (1820, 36), f"{index+1:02} / {len(STORY):02}", 20, CYAN, True, "ra")
    label(draw, (99, 144), entry["chapter"], 26, CYAN, True)
    for j, line in enumerate(wrap(draw, entry["title"], 1730, 69, True)):
        label(draw, (96, 200 + j * 80), line, 69, INK, True)
    subtitle_y = 375 if len(wrap(draw, entry["title"], 1730, 69, True)) == 1 else 422
    for j, line in enumerate(wrap(draw, entry["detail"], 1640, 28)):
        label(draw, (99, subtitle_y + j * 41), line, 28, MUTED)
    if entry.get("label"):
        width = draw.textlength(entry["label"], font=font(21, True)) + 40
        rounded(draw, (1819 - width, 132, 1819, 176), "#44381f", GOLD, 10)
        label(draw, (1799, 141), entry["label"], 21, GOLD, True, "ra")
    draw_diagram(draw, entry, index, local)
    draw_proof(image, draw, entry, index, local)
    draw.rectangle((0, 925, W, H), fill="#061b30")
    draw.line((0, 926, int(W * elapsed / total), 926), fill=CYAN, width=5)
    active = next((value for start, end, value in (cues or [])
                   if start <= elapsed < end), "")
    caption = wrap(draw, active, 1720, 35, True)
    for j, line in enumerate(caption[:2]):
        label(draw, (W//2, 980 + j*43), line, 35, INK, True, "mm")
    # Motion accents: fine progress and a moving edge highlight.
    sweep = int((local / entry["duration"]) * 1830)
    draw.line((96, 901, 96 + sweep, 901), fill="#53aab9", width=3)
    return image


def make_audio(entries, total, output):
    # Delay each spoken clip to its visual beat. Silence between beats is deliberate.
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for entry in entries:
        args += ["-i", entry["speech"]]
    args += ["-stream_loop", "-1", "-i", str(MUSIC)]
    parts = []
    for i, entry in enumerate(entries):
        delay = round((entry["start"] + .27) * 1000)
        parts.append(f"[{i}:a]aresample=48000,atempo={SPEECH_TEMPO},"
                     f"adelay={delay}|{delay},volume=1.55[v{i}]")
    voice_inputs = "".join(f"[v{i}]" for i in range(len(entries)))
    parts.append(f"{voice_inputs}amix=inputs={len(entries)}:normalize=0:duration=longest[voice]")
    music_index = len(entries)
    parts.append(f"[{music_index}:a]aresample=48000,volume=0.12,"
                 f"afade=t=in:st=0:d=2,afade=t=out:st={total-4:.3f}:d=4[bed]")
    parts.append(f"[voice][bed]amix=inputs=2:normalize=0:duration=longest,"
                 f"alimiter=limit=0.92,atrim=duration={total:.3f}[out]")
    args += ["-filter_complex", ";".join(parts), "-map", "[out]",
             "-c:a", "aac", "-b:a", "192k", str(output)]
    subprocess.run(args, check=True)


def main():
    entries, total = timeline()
    cues = caption_cues(entries)
    if total < 120:
        raise RuntimeError(f"Narration timeline is too short: {total:.1f}s")
    output_dir = OUT.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "network-visibility-business-transcript.txt").write_text(
        "Network Visibility Portal — business video transcript\n"
        "AI-generated English narration. ATP examples are demonstrations.\n\n"
        + "\n\n".join(
            f"[{e['start']:06.1f}–{e['start']+e['duration']:06.1f}] "
            f"{e['chapter']} — {e['title']}\n{e['voice']}"
            for e in entries) + "\n"
    )
    (output_dir / "network-visibility-business-captions.srt").write_text(
        "\n\n".join(f"{i}\n{srt_time(start)} --> {srt_time(end)}\n{text}"
                    for i, (start, end, text) in enumerate(cues, 1)) + "\n"
    )
    if "--contact" in sys.argv:
        contact = Image.new("RGB", (960 * 2, 540 * 8))
        for i, e in enumerate(entries):
            shot = frame(e, i, 4.2, total, e["start"] + 4.2, cues).resize((960, 540))
            contact.paste(shot, ((i % 2) * 960, (i // 2) * 540))
        target = output_dir / "network-visibility-business-contact.jpg"
        contact.save(target, quality=87)
        print(target)
        return
    soundtrack = output_dir / "network-visibility-business-audio.m4a"
    make_audio(entries, total, soundtrack)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
            "-i", "pipe:0", "-i", str(soundtrack), "-c:v", "libx264",
            "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-t", f"{total:.3f}", "-movflags", "+faststart", str(OUT)]
    process = subprocess.Popen(args, stdin=subprocess.PIPE)
    try:
        scene_index = 0
        for n in range(round(total * FPS)):
            t = n / FPS
            while scene_index + 1 < len(entries) and t >= entries[scene_index + 1]["start"]:
                scene_index += 1
            e = entries[scene_index]
            process.stdin.write(frame(e, scene_index, t - e["start"], total, t, cues).tobytes())
            if n % (FPS * 10) == 0:
                print(f"{t:.0f} / {total:.1f}s", flush=True)
    finally:
        process.stdin.close()
    if process.wait():
        raise RuntimeError("Video encode failed")
    print(OUT, total)


if __name__ == "__main__":
    main()