/**
 * 食品零食品类脚本模板
 * 包含经典爆款脚本结构，适用于零食、饮品、预制菜、调味料等
 */

import type { Shot } from "@/lib/db/schema";
import type { ScriptTemplate } from "./beauty";

export const foodTemplates: ScriptTemplate[] = [
  {
    name: "试吃测评",
    description: "真实试吃+夸张表情反应，用视觉和听觉（咀嚼音）双重刺激食欲",
    suitableFor: ["零食", "方便食品", "饮品", "糕点", "坚果"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "食物掰开/咬开的瞬间特写，汁水飞溅", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "翻看手机找零食/空空的零食柜", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "快递拆箱/产品阵列俯拍", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "拆袋→近距离展示→入口咀嚼特写", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "销量截图/回购订单", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "产品堆叠 + 价格闪烁", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"这个爆浆的瞬间我录了10遍！"（麻薯掰开，内馅拉丝特写）
【痛点】"刷了一晚上嘴馋，外卖又贵又不健康"（深夜刷手机+空零食柜）
【产品亮相】"这箱XX麻薯终于到了！"（拆快递→取出一盒盒排列）
【使用演示】"先看这个个头，比我拳头还大"（手持对比→掰开拉丝→咬一口→表情陶醉→ASMR咀嚼音）
【信任背书】"我已经回购第4箱了，月销10万+"（订单截图飞入）
【行动号召】"现在下单2箱立减20！3号链接冲，手慢无！"（产品+价格动效）`,
  },
  {
    name: "懒人食谱",
    description: "将产品融入超简单烹饪教程，解决'不会做饭'的痛点",
    suitableFor: ["预制菜", "调味料", "酱料", "速食", "半成品食材"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "成品菜近距离特写，热气腾腾", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "外卖堆积/厨房狼藉的情景", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品包装正面展示", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "烹饪过程快剪：倒入→翻炒→出锅→装盘", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "家人/朋友试吃反应", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "成品菜+产品+优惠信息", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"不会做饭的姐妹看过来！这道菜3分钟搞定！"（红烧肉特写，酱汁浓稠发亮）
【痛点】"天天点外卖，钱包空了身体也垮了"（外卖垃圾堆成山）
【产品亮相】"有了这瓶XX酱，厨房小白秒变大厨"（酱料瓶居中特写）
【使用演示】"五花肉切块→倒入两勺酱→加水没过肉→焖15分钟→出锅！"（快剪烹饪过程）
【信任背书】"老公说比外面饭店做的还好吃！"（老公竖大拇指+一家人吃饭画面）
【行动号召】"一瓶能做20次，算下来每顿不到3块钱！限时买二送一！"（价格计算动画+产品）`,
  },
  {
    name: "办公室投喂",
    description: "利用办公室社交场景制造分享传播，好评即信任背书",
    suitableFor: ["分享装零食", "饼干", "果干", "巧克力", "茶饮冲泡"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "同事们疯抢的场面", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "下午犯困/嘴巴无聊的办公室日常", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "打开分享装/礼盒铺开展示", transition: "ai_start_end" },
      { type: "demo", duration: 6, camera: "分给同事→各种试吃反应集锦", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "同事好评弹幕 + 空袋特写", transition: "ai_start_end" },
      { type: "cta", duration: 3, camera: "产品+办公桌场景+价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"带了一袋零食去公司，5分钟被抢光了！"（同事伸手疯抢画面）
【痛点】"每天下午3点就犯困，嘴巴空空没动力"（办公室趴桌+打哈欠）
【产品亮相】"就是这袋XX每日坚果，独立小包装超方便"（倒出一堆小包+铺满桌面）
【使用演示】"我先来一包——这个腰果好大颗！蔓越莓酸甜的！"（自己吃→分给同事→每人一句短评）
【信任背书】"第二天3个同事让我帮忙带！"（微信群截图：'链接发我！'）
【行动号召】"30包独立装只要XX元，每天不到2块钱！"（产品+价格+购买引导）`,
  },
  {
    name: "深夜放毒",
    description: "利用深夜饥饿感和食物特写ASMR制造强烈购买冲动",
    suitableFor: ["夜宵食品", "即食类", "泡面", "卤味", "烧烤食材"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "食物微距特写+蒸汽/油光", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "深夜翻冰箱什么都没有", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 2, camera: "产品包装 + 打开瞬间", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "加热/烹饪→装盘→吃的全过程ASMR", transition: "direct_concat" },
      { type: "cta", duration: 4, camera: "吃完满足表情 + 产品 + 价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"深夜慎点！这碗螺蛳粉我闻了就疯了！"（汤底沸腾，酸笋和花生特写）
【痛点】"加班到12点，饿得前胸贴后背，外卖全关了"（深夜空荡的厨房+饥饿表情）
【产品亮相】"还好囤了XX螺蛳粉！"（撕开包装→取出料包排列）
【使用演示】"煮面→加料包→搅拌→吸溜一大口"（ASMR咀嚼+汤汁特写+满足表情）
【行动号召】"5包装只要XX元，深夜食堂随时开！点击下方3号链接！"（产品+价格弹入）`,
  },
  {
    name: "健康轻食",
    description: "主打健康概念，用数据和对比打消吃零食的罪恶感",
    suitableFor: ["低卡零食", "代餐", "蛋白棒", "无糖食品", "有机食品"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "称体重/量腰围+吃零食的矛盾画面", transition: "ai_start_end" },
      { type: "pain_point", duration: 4, camera: "普通零食热量表对比", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品+营养成分表特写", transition: "ai_start_end" },
      { type: "demo", duration: 6, camera: "开袋试吃+口感描述", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "减脂期用户好评/体重变化", transition: "ai_start_end" },
      { type: "cta", duration: 3, camera: "产品组合+优惠价", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"减肥期也能放心吃的零食，真的存在！"（一手拿秤一手吃零食，反差画面）
【痛点】"减脂期嘴馋到抓狂，普通饼干一包就400大卡"（热量表大字弹出：薯片=跑步1小时）
【产品亮相】"这款XX蛋白棒，每根只有98大卡！"（产品居中+营养标签放大）
【使用演示】"口感真的绝！像在吃士力架，但热量只有1/4"（掰开展示→咬一口→满意表情）
【信任背书】"健身博主都在推，减脂期的救星"（KOL截图+用户好评墙）
【行动号召】"10根尝鲜装只要XX元！0罪恶感解馋！"（产品+价格+下单引导）`,
  },
];

/** 食品品类特有的 prompt 指令 */
export const foodPromptDirective = `
你正在为【食品零食】品类创作短视频带货脚本。请注意以下要点：
1. 食欲感是第一要义：画面描述中要突出色泽、蒸汽、汁水、质地等细节
2. ASMR音效描述很重要：咀嚼音、酥脆声、汤汁沸腾声要在配音文案中体现
3. 口感描述要具象化："外酥里嫩""入口即化""酸甜交织"等
4. 注意食品安全相关表述，不做虚假营养声明
5. 场景植入自然：办公室、宿舍、深夜、追剧等生活场景
6. 价格锚点很重要：换算成"每包/每顿多少钱"更有说服力
7. 文案风格：吃货分享式，热情洋溢，制造"现在就想吃"的冲动
`;
