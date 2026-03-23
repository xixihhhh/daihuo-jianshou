/**
 * 家居日用品类脚本模板
 * 包含经典爆款脚本结构，适用于清洁用品、收纳、厨房用具、家纺等
 */

import type { Shot } from "@/lib/db/schema";
import type { ScriptTemplate } from "./beauty";

export const homeTemplates: ScriptTemplate[] = [
  {
    name: "痛点解决方案",
    description: "先展示生活痛点场景，再用产品一招解决，对比效果极其强烈",
    suitableFor: ["清洁用品", "收纳工具", "除湿除味", "修补工具", "防滑垫"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "脏乱/问题场景的怼脸特写", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "崩溃表情 + 失败的传统方法", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品从画面外滑入，居中特写", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "使用过程 + 效果对比分屏", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "用户好评截图 / 销量数据", transition: "ffmpeg_fade" },
      { type: "cta", duration: 4, camera: "before/after 对比 + 产品 + 价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"家里的玻璃胶发霉发黑？千万别铲！"（发霉玻璃胶特写，触目惊心）
【痛点】"用刷子刷、用酒精擦、用牙膏涂...全都没用！"（各种失败方法快速闪过）
【产品亮相】"试试这个XX除霉啫喱"（产品居中，瓶身特写）
【使用演示】"挤上去，盖上保鲜膜，等6小时"（操作过程→快进→揭开保鲜膜→焕然一新！）
【信任背书】"已经卖出200万支了，好评率99%"（销量+好评弹幕飞过）
【行动号召】"一支能用半年，今天特价只要XX元！点下方链接！"（对比图+产品+价格）`,
  },
  {
    name: "好物开箱",
    description: "拆箱仪式感+颜值展示+使用体验，三重满足",
    suitableFor: ["家居装饰", "桌面摆件", "香薰", "餐具套装", "家纺床品"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "精致包装的开箱瞬间", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "家里旧物/单调空间展示", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 4, camera: "产品全角度展示+细节微距", transition: "ai_start_end" },
      { type: "demo", duration: 7, camera: "放入实际空间+氛围感展示", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "买家秀/网红同款对比", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "氛围感全景+产品+价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"拆到这个快递的时候我尖叫了！"（双手撕开快递→露出精致礼盒）
【痛点】"租的房子太单调了，毫无生活气息"（空荡荡的白墙+简陋桌面）
【产品亮相】"这套XX香薰蜡烛也太美了吧！"（取出→每个角度慢旋转→纹理微距）
【使用演示】"放在书桌上，点燃的那一刻整个房间都温柔了"（点燃→烛光摇曳→房间暖光氛围）
【信任背书】"小红书爆了的平价高级感好物"（小红书笔记截图+点赞数）
【行动号召】"3支套装只要XX元，比星巴克一杯咖啡还便宜！"（套装+价格弹出）`,
  },
  {
    name: "家务革命",
    description: "用夸张的家务效率对比突出产品的省时省力",
    suitableFor: ["扫地机器人", "拖把", "洗碗机", "洗衣凝珠", "多功能清洁剂"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "累到瘫倒在沙发上/家务堆积", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "传统做家务的辛苦过程", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品闪亮登场（英雄式登场）", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "产品使用过程 + 计时器倒计时", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "家人反应 / 时间对比图表", transition: "ai_start_end" },
      { type: "cta", duration: 4, camera: "干净整洁的家 + 产品 + 优惠", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"以前拖地1小时，现在只要5分钟！"（计时器5:00→拖地完成→地板反光）
【痛点】"下班回家还要拖地擦桌子洗碗...真的想罢工！"（瘫在沙发上+脏乱的厨房）
【产品亮相】"自从买了这个XX免手洗拖把，家务减负80%"（拖把从盒中取出，旋转展示）
【使用演示】"脏水自动清洗，拖把自动拧干"（一键清洗演示→拖地过程→前后对比）
【信任背书】"老婆说这是我今年买得最值的东西"（老婆竖大拇指+家庭温馨画面）
【行动号召】"原价299今天只要149！送替换拖布3块！"（产品+价格+限时标签）`,
  },
  {
    name: "出租屋改造",
    description: "小成本改造出租屋，精准打中年轻人租房痛点",
    suitableFor: ["墙贴", "LED灯带", "置物架", "窗帘", "地毯", "桌布"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "改造后的惊艳效果（倒叙）", transition: "ai_start_end" },
      { type: "pain_point", duration: 4, camera: "出租屋原始状态的各种问题", transition: "direct_concat" },
      { type: "product_reveal", duration: 3, camera: "一堆改造好物铺开展示", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "贴/装/摆的改造过程 + 快进", transition: "direct_concat" },
      { type: "cta", duration: 4, camera: "全景before/after + 总花费 + 链接", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"花200块把出租屋改成ins风！房东看了都想涨房租！"（改造后房间全景，灯光温馨）
【痛点】"大白墙、老旧家具、昏暗灯光...这就是月租3000的房子"（出租屋原始面貌360度展示）
【产品亮相】"今天改造只用这5件好物"（5样产品一字排开+总价显示）
【使用演示】"贴墙纸→挂灯带→铺地毯→放置物架→换桌布"（每步快进+完成效果对比）
【行动号召】"全部加起来不到200块！链接都给你们放好了！"（5件产品分格+分别价格+总价）`,
  },
];

/** 家居品类特有的 prompt 指令 */
export const homePromptDirective = `
你正在为【家居日用】品类创作短视频带货脚本。请注意以下要点：
1. Before/After对比是最强说服力：脏vs干净、乱vs整齐、旧vs新
2. 操作简便性要突出："一喷一擦""一键启动""免打孔安装"等
3. 使用场景要真实：厨房、卫生间、卧室、出租屋等真实生活空间
4. 时间/金钱成本换算："每天不到X元""省下X小时"更有冲击力
5. 氛围感很重要：灯光、角度、布景要有家居博主的质感
6. 文案风格：生活家/家居博主式，有烟火气又不失品质感
7. 注意突出耐用性和性价比，这是家居用品的核心决策因素
`;
