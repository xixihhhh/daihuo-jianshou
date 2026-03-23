/**
 * 美妆护肤品类脚本模板
 * 包含经典爆款脚本结构，适用于护肤品、彩妆、美容仪器等
 */

import type { Shot } from "@/lib/db/schema";

/** 美妆品类脚本模板结构 */
export interface ScriptTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 适用场景 */
  suitableFor: string[];
  /** 分镜结构（不含具体文案，作为骨架） */
  shotStructure: Array<Pick<Shot, "type" | "duration" | "camera" | "transition">>;
  /** 参考脚本示例（用于 few-shot prompt） */
  example: string;
}

export const beautyTemplates: ScriptTemplate[] = [
  {
    name: "素颜逆袭",
    description: "从素颜到妆后的对比反转，利用视觉冲击力引发好奇和购买欲",
    suitableFor: ["底妆", "遮瑕", "粉底液", "气垫", "素颜霜"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "怼脸特写，微微晃动", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "脸部特写慢慢拉远", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品居中旋转展示", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "手部上妆过程特写 + 脸部分屏对比", transition: "ai_start_end" },
      { type: "social_proof", duration: 3, camera: "评论截图 / 销量数据飞入", transition: "ffmpeg_fade" },
      { type: "cta", duration: 4, camera: "完妆脸部特写 + 产品叠化", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"姐妹们，别划走！这个素颜出门的效果你敢信？"（素颜怼脸，痘印斑点清晰可见）
【痛点】"每次化妆都要半小时，底妆还斑驳卡粉？之前我也这样..."（叹气表情）
【产品亮相】"直到我发现了这款XX粉底液"（产品从下方滑入画面）
【使用演示】"看好了，就一泵的量"（手背试色→上脸→推开→分屏素颜vs上妆对比）
【信任背书】"小红书5万+收藏，回购率92%"（数据飞入画面）
【行动号召】"今天直播间买一送一，库存只剩最后200件，点下方链接抢！"（完妆特写+产品+价格标签）`,
  },
  {
    name: "成分党种草",
    description: "从成分科学角度切入，建立专业信任感后推荐产品",
    suitableFor: ["精华液", "面霜", "防晒", "眼霜", "面膜"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "产品成分表特写", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "肤质问题近距离展示", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 4, camera: "产品全景 + 成分图示飞入", transition: "ai_start_end" },
      { type: "demo", duration: 7, camera: "质地展示 + 上脸涂抹过程", transition: "ai_start_end" },
      { type: "social_proof", duration: 3, camera: "使用前后对比图", transition: "ffmpeg_fade" },
      { type: "cta", duration: 4, camera: "产品 + 价格卡片", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"含30%烟酰胺的精华你敢用吗？这个浓度真的太猛了！"（成分表怼脸）
【痛点】"换季烂脸、暗沉发黄，花了几千块什么都没改善"（展示泛红暗沉肌肤）
【产品亮相】"这瓶XX精华，核心成分是30%烟酰胺+传明酸+光甘草定"（产品特写+成分图解）
【使用演示】"质地是流动的水状，上脸0负担"（挤到手背→展示流动性→上脸按压吸收）
【信任背书】"用了28天，暗沉真的肉眼可见提亮了"（前后对比照）
【行动号召】"旗舰店299，我们这里只要159，赠同款小样3支！"（价格卡片弹入）`,
  },
  {
    name: "一抹变色",
    description: "利用产品使用前后的即时视觉变化制造冲击力",
    suitableFor: ["唇釉", "腮红", "眼影", "染发剂", "美白牙贴"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "使用瞬间的近景特写", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "中景展示无妆状态", transition: "direct_concat" },
      { type: "product_reveal", duration: 3, camera: "产品微距 + 质地展示", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "上妆过程特写 + 颜色变化", transition: "direct_concat" },
      { type: "cta", duration: 3, camera: "完妆全脸 + 产品 + 价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"这个颜色也太绝了吧！"（嘴唇特写，唇釉一抹变色瞬间）
【痛点】"纯素颜嘴巴真的没气色，整个人看着很憔悴"（展示素唇）
【产品亮相】"这支XX唇釉，色号是#208蜜桃乌龙"（产品旋转+刷头沾满唇釉特写）
【使用演示】"薄涂一层奶茶色，厚涂就是烂番茄！"（上唇过程→薄涂效果→叠涂效果→各角度展示）
【行动号召】"今天下单立减30，还送同系列唇线笔！3号链接冲！"（完妆+价格浮窗）`,
  },
  {
    name: "约会妆教",
    description: "场景化教程式种草，将产品植入实用妆容教程中",
    suitableFor: ["彩妆套装", "眼影盘", "口红", "高光修容", "定妆喷雾"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "完妆美颜特写（倒叙）", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "约会场景焦虑情景", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "化妆台产品阵列展示", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "分步骤妆教特写", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "评论/男友反应片段", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "产品合集 + 优惠信息", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"约会画这个妆，他全程盯着你看！"（完妆转头微笑慢动作）
【痛点】"每次约会前化妆都手抖，生怕画成'刻意感'..."（对镜焦虑表情）
【产品亮相】"今天的约会妆只用这4样"（化妆台俯拍，4个产品排列）
【使用演示】"底妆→眼影→腮红→唇妆，每步30秒搞定"（分步快进教程+产品名弹幕）
【信任背书】"上次用这个妆出门，朋友都问我是不是恋爱了哈哈"（聊天截图/评论飞入）
【行动号召】"这4个产品打包价只要XXX，还送化妆包！"（产品组合+价格标）`,
  },
];

/** 美妆品类特有的 prompt 指令 */
export const beautyPromptDirective = `
你正在为【美妆护肤】品类创作短视频带货脚本。请注意以下要点：
1. 视觉冲击力是核心：妆前妆后对比、质地特写、颜色展示是关键画面
2. 成分和功效要言之有物，避免违禁词（如"药妆""医学级"等）
3. 使用感受要具体化："丝滑""轻薄""贴皮"比"好用"更有说服力
4. 配色和光线描述要精准，方便后续 AI 生成素材
5. 目标用户画像：18-35岁女性，注重性价比和真实使用效果
6. 文案风格：闺蜜聊天式，真诚不做作，可以适当用网络热词
`;
