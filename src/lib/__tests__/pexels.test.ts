import { describe, it, expect } from "vitest";
import {
  pickBestVideoFile,
  toVideoCandidate,
  filterByDuration,
  orientationOf,
  inferExtension,
  pickPhotoSrc,
  toPhotoCandidate,
  type PexelsVideo,
  type PexelsPhoto,
} from "@/lib/providers/pexels";

// Real Pexels video response (sampled 2026-06, portrait coffee footage) used to drive pure-function tests
const REAL_VIDEO: PexelsVideo = {
  id: 10743047,
  width: 2100,
  height: 3734,
  duration: 6,
  url: "https://www.pexels.com/video/fresh-coffee-in-autumn-ambiance-10743047/",
  image: "https://images.pexels.com/videos/10743047/preview.jpeg",
  user: { id: 669175, name: "Kateryna Hnidash", url: "https://www.pexels.com/@katerynahnidash" },
  video_files: [
    { id: 4746027, quality: "hd", file_type: "video/mp4", width: 720, height: 1280, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-hd_720_1280_25fps.mp4", size: 1969262 },
    { id: 4746028, quality: "hd", file_type: "video/mp4", width: 1080, height: 1920, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-hd_1080_1920_25fps.mp4", size: 3639032 },
    { id: 4746029, quality: "hd", file_type: "video/mp4", width: 2100, height: 3734, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-hd_2100_3734_25fps.mp4", size: 16272262 },
    { id: 4746030, quality: "sd", file_type: "video/mp4", width: 540, height: 960, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-sd_540_960_25fps.mp4", size: 1188037 },
    { id: 4746031, quality: "hd", file_type: "video/mp4", width: 1440, height: 2560, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-hd_1440_2560_25fps.mp4", size: 9019185 },
    { id: 4746032, quality: "sd", file_type: "video/mp4", width: 360, height: 640, fps: 25, link: "https://videos.pexels.com/video-files/10743047/10743047-sd_360_640_25fps.mp4", size: 425950 },
  ],
};

describe("orientationOf", () => {
  it("按宽高判断方向", () => {
    expect(orientationOf(540, 960)).toBe("portrait");
    expect(orientationOf(1920, 1080)).toBe("landscape");
    expect(orientationOf(100, 100)).toBe("square");
  });
});

describe("pickBestVideoFile", () => {
  it("竖屏 minShortSide=720 时选「达标里体积最小」= 720x1280", () => {
    const f = pickBestVideoFile(REAL_VIDEO.video_files, { orientation: "portrait", minShortSide: 720 });
    expect(f?.width).toBe(720);
    expect(f?.height).toBe(1280);
  });

  it("提高门槛到 1080 时升到 1080x1920", () => {
    const f = pickBestVideoFile(REAL_VIDEO.video_files, { orientation: "portrait", minShortSide: 1080 });
    expect(f?.height).toBe(1920);
  });

  it("门槛高到没有达标者时回退到分辨率最高一条", () => {
    const f = pickBestVideoFile(REAL_VIDEO.video_files, { orientation: "portrait", minShortSide: 9999 });
    expect(f?.height).toBe(3734); // 2100x3734 has the largest short side
  });

  it("只在横屏方向无匹配时回退全部池", () => {
    const f = pickBestVideoFile(REAL_VIDEO.video_files, { orientation: "landscape", minShortSide: 720 });
    // all files are portrait; after fallback still picks smallest file with short side >= 720
    expect(f).not.toBeNull();
  });

  it("无 mp4 文件返回 null", () => {
    expect(pickBestVideoFile([], {})).toBeNull();
  });
});

describe("toVideoCandidate", () => {
  it("归一化保留合规归属字段（作者/来源页/授权）", () => {
    const c = toVideoCandidate(REAL_VIDEO, { orientation: "portrait", minShortSide: 720 });
    expect(c).not.toBeNull();
    expect(c!.author).toBe("Kateryna Hnidash");
    expect(c!.pageUrl).toContain("pexels.com");
    expect(c!.license).toBe("Pexels");
    expect(c!.durationSec).toBe(6);
    expect(c!.downloadUrl).toContain(".mp4");
    expect(c!.mediaType).toBe("video");
  });
});

describe("filterByDuration", () => {
  it("时长在区间内保留，超出剔除", () => {
    const c = toVideoCandidate(REAL_VIDEO, {})!;
    expect(filterByDuration([c], { minSec: 3, maxSec: 10 })).toHaveLength(1);
    expect(filterByDuration([c], { minSec: 8 })).toHaveLength(0);
  });
});

describe("inferExtension", () => {
  it("从直链推断扩展名", () => {
    expect(inferExtension("https://x/a-hd_540_960.mp4")).toBe("mp4");
    expect(inferExtension("https://x/a.jpg")).toBe("jpg");
  });
  it("优先用 content-type", () => {
    expect(inferExtension("https://x/noext", "image/png")).toBe("png");
    expect(inferExtension("https://x/a.mp4", "video/webm")).toBe("webm");
  });
});

describe("图片候选", () => {
  const PHOTO: PexelsPhoto = {
    id: 1,
    width: 4000,
    height: 6000,
    url: "https://www.pexels.com/photo/x-1/",
    photographer: "Jane",
    photographer_url: "https://www.pexels.com/@jane",
    alt: "coffee",
    src: {
      original: "https://images.pexels.com/photos/1/orig.jpg",
      large2x: "https://images.pexels.com/photos/1/l2x.jpg",
      large: "https://images.pexels.com/photos/1/l.jpg",
      medium: "https://images.pexels.com/photos/1/m.jpg",
      portrait: "https://images.pexels.com/photos/1/portrait.jpg",
      landscape: "https://images.pexels.com/photos/1/landscape.jpg",
      tiny: "https://images.pexels.com/photos/1/tiny.jpg",
    },
  };

  it("竖屏取 portrait 源，并保留作者署名", () => {
    expect(pickPhotoSrc(PHOTO, "portrait")).toContain("portrait.jpg");
    const c = toPhotoCandidate(PHOTO, "portrait");
    expect(c.author).toBe("Jane");
    expect(c.mediaType).toBe("image");
    expect(c.license).toBe("Pexels");
  });
});
