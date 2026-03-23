/**
 * 数码3C品类脚本模板
 * 包含经典爆款脚本结构，适用于手机配件、智能设备、电脑外设、家电等
 */

import type { Shot } from "@/lib/db/schema";
import type { ScriptTemplate } from "./beauty";

export const techTemplates: ScriptTemplate[] = [
  {
    name: "开箱首测",
    description: "新品开箱+功能实测，满足数码爱好者的好奇心和尝鲜欲",
    suitableFor: ["新品数码", "手机", "耳机", "智能手表", "平板配件"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "产品最惊艳的功能瞬间", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "旧设备的种种不便", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 4, camera: "开箱全过程+配件展示+产品各角度", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "核心功能逐一实测+屏幕/数据录制", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "跑分数据/专业评测引用", transition: "ai_start_end" },
      { type: "cta", duration: 3, camera: "产品+价格+购买渠道", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"这个降噪效果我直接跪了！"（戴上耳机→周围噪音瞬间消失→震惊表情）
【痛点】"地铁上听歌全是噪音，开会耳机漏音被同事听到..."（嘈杂环境+尴尬表情）
【产品亮相】"XX降噪耳机到手！先看包装——"（拆封→取出耳机→充电盒→各角度展示）
【使用演示】"降噪实测：关闭→普通→深度降噪"（三档切换+环境音对比）→"通话降噪：对面完全听不到背景音"→"续航实测：充一次用了整整8小时"
【信任背书】"某知名评测博主评分9.2，同价位降噪天花板"（评测截图）
【行动号召】"首发价XX元，比官网便宜200！前50名送收纳包！"（产品+价格+赠品）`,
  },
  {
    name: "效率神器",
    description: "聚焦生产力场景，展示产品如何提升工作/学习效率",
    suitableFor: ["键盘", "显示器", "充电器", "扩展坞", "平板", "打印机"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "使用前后的效率对比（分屏）", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "工作/学习中的效率痛点", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "桌面全景中产品亮相", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "实际使用场景演示+效率提升可视化", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "用户评价/专业人士推荐", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "桌面全景+产品+价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"自从用了这个，我每天早下班2小时！"（分屏：左边手忙脚乱vs右边从容操作）
【痛点】"笔记本只有2个接口，开会投屏还要拔U盘，崩溃！"（桌面线材缠绕+接口不够用）
【产品亮相】"这个XX 12合1扩展坞，彻底解决接口焦虑"（产品放在桌面→各接口标注）
【使用演示】"HDMI双屏扩展→SD卡直接读取→100W快充直通→千兆网口秒连"（每个接口实际接入演示）
【信任背书】"程序员圈人手一个，某乎推荐Top1"（知乎截图+IT博主推荐）
【行动号召】"到手价XX元，送理线带+收纳袋！"（产品+价格+赠品清单）`,
  },
  {
    name: "极限测试",
    description: "通过极端环境/条件测试展示产品品质，制造话题和信任",
    suitableFor: ["手机壳", "充电宝", "运动手表", "防水设备", "保护膜"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "极端测试的精彩瞬间（高空落下/水中等）", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "日常损坏场景集锦", transition: "direct_concat" },
      { type: "product_reveal", duration: 3, camera: "产品正面展示+卖点标注", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "多项极限测试全过程", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "测试结果汇总/用户真实故事", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "测试后完好的产品+价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"从10楼扔下去还能用！这手机壳什么做的？？"（手机从高处坠落慢动作→捡起来完好无损）
【痛点】"换了3个手机壳，一摔就裂，手机角都磕花了"（碎裂手机壳合集+手机磕碰痕迹）
【产品亮相】"这个XX军工级手机壳，我要好好测一下"（手机壳各角度→气囊结构特写→材质触感）
【使用演示】"测试1：2米高度跌落→完好！测试2：汽车碾压→完好！测试3：钥匙暴力划→0划痕！"（每项测试完整记录）
【信任背书】"美军MIL-STD-810G认证，这不是吹的"（认证标志+用户实测好评）
【行动号召】"一个壳用到换手机，XX元保你用3年！"（产品+价格+购买引导）`,
  },
  {
    name: "桌面改造",
    description: "极客/文艺风桌面搭建过程，种草桌面好物",
    suitableFor: ["桌面收纳", "显示器支架", "氛围灯", "桌垫", "音箱", "充电底座"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "完美桌面全景 + 灯光氛围", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "混乱的桌面现状", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "所有好物一字排开", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "逐一安装/摆放 + 每样的使用效果", transition: "direct_concat" },
      { type: "cta", duration: 4, camera: "完成桌面全景 + 产品清单 + 总价", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"这个桌面太干净了吧！线都去哪了？"（极简桌面全景，RGB灯光流动）
【痛点】"我的桌面：线缆像蜘蛛网，杂物堆成山"（凌乱桌面360度展示）
【产品亮相】"改造用到这6件好物"（6件产品并排展示+价格标签）
【使用演示】"Step1: 显示器支架→桌面多出50%空间｜Step2: 理线槽→线缆全隐藏｜Step3: 无线充电板→告别充电线｜Step4: 屏幕挂灯→不占桌面｜Step5: 桌垫→颜值翻倍｜Step6: 氛围灯→仪式感拉满"
【行动号召】"6件总共不到XX元！清单放评论区！"（完成桌面+购物清单+总价）`,
  },
  {
    name: "对比横评",
    description: "多款同类产品横向对比，最后推荐性价比最高的那款",
    suitableFor: ["充电宝", "蓝牙耳机", "数据线", "手机支架", "智能灯"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "多款产品并排对比画面", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "选择困难/踩雷经历", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 4, camera: "参评产品逐一亮相+价格标注", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "逐项对比测试（外观/性能/细节）", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "评分汇总表/推荐理由", transition: "ai_start_end" },
      { type: "cta", duration: 3, camera: "推荐款特写+价格+购买引导", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"花2000块买了5款充电宝，就为了告诉你买哪个！"（5款充电宝排成一排）
【痛点】"充电宝踩雷太多了——虚标容量、充电慢、还有安全隐患"（烂充电宝合集）
【产品亮相】"今天横评这5款：A品牌99元/B品牌149元/C品牌199元/D品牌249元/E品牌399元"（逐一亮相+价格）
【使用演示】"测试1：实际容量→C款最实在｜测试2：充电速度→C款67W最快｜测试3：做工细节→C款铝合金手感最好｜测试4：安全认证→C款通过全部认证"
【信任背书】"综合评分：C款 9.5分稳居第一"（评分对比图表）
【行动号召】"闭眼入C款！今天下单XX元到手！"（C款产品特写+价格+下单引导）`,
  },
];

/** 数码3C品类特有的 prompt 指令 */
export const techPromptDirective = `
你正在为【数码3C】品类创作短视频带货脚本。请注意以下要点：
1. 参数不要堆砌，要翻译成用户能感知的体验："67W快充"→"30分钟充满"
2. 实测数据比宣传话术更有说服力：续航实测、速度实测、跌落测试等
3. 使用场景具象化：通勤、办公、游戏、出差等具体场景
4. 与竞品/旧设备的对比能快速建立认知：快多少、轻多少、省多少
5. 极客用户在意参数，普通用户在意体验，脚本要两者兼顾
6. 文案风格：科技博主式，专业但不枯燥，偶尔带点极客幽默
7. 配件类产品要突出与主设备（手机/电脑）的兼容性和搭配效果
8. 注意不要做未经验证的性能承诺，保持客观公正的测评态度
`;
