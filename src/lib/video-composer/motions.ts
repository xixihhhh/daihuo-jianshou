// 商品原图运动效果 - 基于 FFmpeg zoompan 滤镜
// 用于商品展示镜头，不让 AI 碰商品图，用运动模板代替
export interface MotionConfig {
  name: string;
  label: string;
  description: string;
  // FFmpeg zoompan 滤镜参数
  getFilter: (width: number, height: number, duration: number) => string;
}

export const MOTIONS: Record<string, MotionConfig> = {
  zoom_in_slow: {
    name: "zoom_in_slow",
    label: "缓慢放大",
    description: "从全景缓慢放大到商品细节",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='min(zoom+0.002,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  zoom_out_slow: {
    name: "zoom_out_slow",
    label: "缓慢缩小",
    description: "从商品细节缓慢缩小到全景",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='if(eq(on,1),1.5,max(zoom-0.002,1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  pan_left: {
    name: "pan_left",
    label: "左移",
    description: "镜头从右向左平移展示商品",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='1.3':x='iw/2-(iw/zoom/2)+on*(iw/zoom/${frames}*0.3)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  pan_right: {
    name: "pan_right",
    label: "右移",
    description: "镜头从左向右平移展示商品",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='1.3':x='iw/2-(iw/zoom/2)-on*(iw/zoom/${frames}*0.3)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  ken_burns: {
    name: "ken_burns",
    label: "肯伯恩斯",
    description: "经典纪录片效果，缓慢放大同时轻微平移",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='min(zoom+0.001,1.3)':x='iw/2-(iw/zoom/2)+on*0.5':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  bounce: {
    name: "bounce",
    label: "弹跳",
    description: "商品从小到大弹入画面",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='if(lt(on,${Math.floor(frames * 0.3)}),1+on*0.02,if(lt(on,${Math.floor(frames * 0.5)}),1.6-(on-${Math.floor(frames * 0.3)})*0.01,1.4))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
};

// 获取运动效果列表
export function getMotionList(): MotionConfig[] {
  return Object.values(MOTIONS);
}
