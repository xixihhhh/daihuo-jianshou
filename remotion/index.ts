// Remotion 入口：注册可渲染的动效元素合成。
// 这是「可选动效模块」，不进 ClipForge 主构建（tsconfig 已排除 remotion/）。
// 启用前先装依赖：npm i remotion @remotion/cli react react-dom
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
