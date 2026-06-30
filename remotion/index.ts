// Remotion entry point: registers renderable motion element compositions.
// This is the "optional motion module" — excluded from the ClipForge main build (tsconfig already excludes remotion/).
// Install dependencies before enabling: npm i remotion @remotion/cli react react-dom
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
