/**
 * ffmpeg / ffprobe 二进制路径解析 —— 让命令可指向随包二进制，支撑 Electron 打包
 *
 * 开发态：回退到系统 PATH 里的 `ffmpeg` / `ffprobe`（行为与原来一致）。
 * Electron 打包：主进程把 ffmpeg-static / @ffprobe-installer 解包后的绝对路径注入
 * FFMPEG_PATH / FFPROBE_PATH 环境变量，用户机无需自行安装 ffmpeg。
 *
 * 注意：返回值会被拼进 shell 命令字符串，路径可能含空格，调用处用双引号包裹。
 */

/** ffmpeg 可执行文件路径（含空格时调用方需加引号） */
export function ffmpegBin(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

/** ffprobe 可执行文件路径（含空格时调用方需加引号） */
export function ffprobeBin(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}
