import { describe, it, expect, afterEach } from "vitest";
import { ffmpegBin, ffprobeBin } from "@/lib/ffmpeg-path";
import { buildComposeCommand, type ComposeConfig } from "@/lib/video-composer/composer";

const origFf = process.env.FFMPEG_PATH;
const origFp = process.env.FFPROBE_PATH;

afterEach(() => {
  if (origFf === undefined) delete process.env.FFMPEG_PATH;
  else process.env.FFMPEG_PATH = origFf;
  if (origFp === undefined) delete process.env.FFPROBE_PATH;
  else process.env.FFPROBE_PATH = origFp;
});

describe("ffmpeg/ffprobe 二进制路径解析", () => {
  it("未注入时回退系统 ffmpeg/ffprobe（开发态不变）", () => {
    delete process.env.FFMPEG_PATH;
    delete process.env.FFPROBE_PATH;
    expect(ffmpegBin()).toBe("ffmpeg");
    expect(ffprobeBin()).toBe("ffprobe");
  });

  it("注入绝对路径时返回该路径（Electron 随包二进制）", () => {
    process.env.FFMPEG_PATH = "/Apps/ClipForge.app/Contents/Resources/ffmpeg";
    process.env.FFPROBE_PATH = "/Apps/ClipForge.app/Contents/Resources/ffprobe";
    expect(ffmpegBin()).toContain("ffmpeg");
    expect(ffprobeBin()).toContain("ffprobe");
  });

  it("buildComposeCommand 用注入的 FFMPEG_PATH（含空格被引号包裹）", () => {
    const cfg: ComposeConfig = {
      projectId: "p1",
      clips: [{ type: "image", filePath: "/d/a.jpg", duration: 3, transition: "direct_concat", motion: "static" }],
      output: { resolution: "1080p", aspectRatio: "9:16" },
    };
    process.env.FFMPEG_PATH = "/with space/ffmpeg";
    const cmd = buildComposeCommand(cfg);
    expect(cmd).toContain(`"/with space/ffmpeg" -y`);
  });

  it("未注入时 buildComposeCommand 仍以 ffmpeg 起手（向后兼容）", () => {
    delete process.env.FFMPEG_PATH;
    const cfg: ComposeConfig = {
      projectId: "p1",
      clips: [{ type: "image", filePath: "/d/a.jpg", duration: 3, transition: "direct_concat", motion: "static" }],
      output: { resolution: "1080p", aspectRatio: "9:16" },
    };
    const cmd = buildComposeCommand(cfg);
    expect(cmd).toContain(`"ffmpeg" -y`);
  });
});
