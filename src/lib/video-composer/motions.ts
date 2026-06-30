// product image camera motion effects — based on the FFmpeg zoompan filter
// used for product showcase shots; keeps AI away from product images by substituting motion templates
import { interpolate } from "./easing";

export interface MotionConfig {
  name: string;
  label: string;
  description: string;
  // FFmpeg zoompan filter parameters
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
      const z = interpolate("on", frames, 1, 1.5, "easeOut"); // ease-out zoom in, decelerates to rest — more cinematic than linear
      return `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
  zoom_out_slow: {
    name: "zoom_out_slow",
    label: "缓慢缩小",
    description: "从商品细节缓慢缩小到全景",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      const z = interpolate("on", frames, 1.5, 1, "easeOut"); // ease-out zoom out
      return `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
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
      const z = interpolate("on", frames, 1, 1.3, "easeOut"); // ease-out zoom in + gentle pan
      return `zoompan=z='${z}':x='iw/2-(iw/zoom/2)+on*0.5':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
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
  // static: no camera motion, just hold the frame for the given duration (output format matches other motion effects so it can be concatenated with them)
  static: {
    name: "static",
    label: "静止",
    description: "画面定格，无运镜",
    getFilter: (w, h, d) => {
      const fps = 30;
      const frames = d * fps;
      return `zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${fps}`;
    },
  },
};

// default motion: fallback when the specified motion key is invalid, preventing the clip from being silently dropped
export const DEFAULT_MOTION = "ken_burns";

// get the list of available motion effects
export function getMotionList(): MotionConfig[] {
  return Object.values(MOTIONS);
}
