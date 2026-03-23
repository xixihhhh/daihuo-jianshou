/**
 * 服饰鞋包品类脚本模板
 * 包含经典爆款脚本结构，适用于女装、男装、鞋子、包包、配饰等
 */

import type { Shot } from "@/lib/db/schema";
import type { ScriptTemplate } from "./beauty";

export const fashionTemplates: ScriptTemplate[] = [
  {
    name: "穿搭变身",
    description: "从路人到时尚达人的穿搭变身，利用反转制造视觉冲击",
    suitableFor: ["连衣裙", "外套", "套装", "一整套穿搭", "风格单品"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "变身后的惊艳全身镜头（倒叙）", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "衣柜一堆衣服不知道穿什么", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "衣服平铺/衣架展示+面料特写", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "上身展示：正面/侧面/背面 + 细节特写", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "街拍回头率/朋友反应", transition: "ai_start_end" },
      { type: "cta", duration: 3, camera: "全身穿搭 + 产品信息 + 价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"穿上这件裙子，整条街都在看我！"（慢动作转圈，裙摆飞扬）
【痛点】"衣柜塞满了衣服，出门还是觉得没衣服穿"（翻衣柜崩溃画面）
【产品亮相】"这条XX法式碎花裙，一眼就心动了"（裙子从衣架取下→面料垂坠感→花纹特写）
【使用演示】"看这个版型，收腰显瘦还不挑身材"（正面→侧面→背面→走路自然摆动→坐下不起皱）
【信任背书】"穿出去逛街被3个人问链接！"（街拍路人回头+朋友惊叹表情）
【行动号召】"S-XXL都有，现在下单还送同款发带！"（尺码表+产品+价格+赠品展示）`,
  },
  {
    name: "一衣多穿",
    description: "同一件单品搭出多种风格，突出性价比和百搭属性",
    suitableFor: ["基础款", "衬衫", "西装外套", "牛仔裤", "白T恤"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "快速切换多套穿搭的混剪", transition: "ai_start_end" },
      { type: "pain_point", duration: 3, camera: "买了一堆只穿一次的衣服", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "单品平铺展示+面料触感", transition: "ai_start_end" },
      { type: "demo", duration: 10, camera: "3-4种搭配方案依次展示", transition: "ai_start_end" },
      { type: "social_proof", duration: 3, camera: "穿搭博主推荐集锦", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "4套穿搭四宫格 + 产品 + 价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"一件衣服穿出4种风格！通勤约会全搞定！"（快速切换4套穿搭）
【痛点】"买了一柜子衣服，每件只穿一次就压箱底了"（衣柜爆满+标签还没拆的衣服）
【产品亮相】"这件XX白衬衫，质感好到离谱"（衬衫特写→面料触感→不起皱演示）
【使用演示】"Look1: 搭西裤=职场精英｜Look2: 搭牛仔裙=甜酷女孩｜Look3: 搭阔腿裤=慵懒法式｜Look4: 单穿当裙子=度假风"
【信任背书】"全网穿搭博主都在推的万能单品"（博主穿搭截图合集）
【行动号召】"到手价只要XX元，配XS到XXL！"（四宫格穿搭+价格）`,
  },
  {
    name: "身材焦虑终结",
    description: "针对身材痛点（梨形、苹果型、小个子等），用穿搭解决方案种草",
    suitableFor: ["显瘦单品", "增高裤", "遮肉连衣裙", "大码女装", "小个子穿搭"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "穿前/穿后同角度对比", transition: "direct_concat" },
      { type: "pain_point", duration: 4, camera: "试穿不合适的衣服尴尬画面", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 3, camera: "产品展示+设计细节标注", transition: "ai_start_end" },
      { type: "demo", duration: 8, camera: "上身效果展示+遮肉/显高/显瘦效果", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "不同身材用户穿搭展示", transition: "ai_start_end" },
      { type: "cta", duration: 4, camera: "全身效果 + 产品 + 价格 + 尺码指引", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"小肚子、胯宽？穿这条裤子全部藏住！"（穿前腰腹特写→穿后腰腹特写，视觉对比强烈）
【痛点】"梨形身材的痛，胯宽腿粗，裤子要么腰大要么腿紧"（试穿紧身裤的尴尬画面）
【产品亮相】"这条XX高腰阔腿裤，专为梨形身材设计"（裤子展示→高腰设计→裤腿宽度→面料垂感）
【使用演示】"高腰线直接拉长腿部比例，A字裤型完美遮胯"（上身→正面/侧面→走路效果→坐下不紧绷）
【信任背书】"90斤到150斤的姐妹都在穿！"（不同身材买家秀拼图）
【行动号召】"XS-3XL全尺码！今天前100名送腰带！"（尺码对照表+产品+价格）`,
  },
  {
    name: "季节换新",
    description: "结合季节变换推荐应季新品，制造换季购买紧迫感",
    suitableFor: ["换季新品", "羽绒服", "防晒衣", "春装", "秋冬外套"],
    shotStructure: [
      { type: "hook", duration: 3, camera: "季节感画面+穿搭展示", transition: "direct_concat" },
      { type: "pain_point", duration: 3, camera: "换季没衣服穿/去年的穿不了", transition: "ffmpeg_fade" },
      { type: "product_reveal", duration: 4, camera: "新品展示+面料科技讲解", transition: "ai_start_end" },
      { type: "demo", duration: 7, camera: "室内外场景穿搭展示", transition: "direct_concat" },
      { type: "social_proof", duration: 3, camera: "预售/销量数据", transition: "ffmpeg_fade" },
      { type: "cta", duration: 3, camera: "场景穿搭+产品+限时价格", transition: "ffmpeg_fade" },
    ],
    example: `【黄金3秒】"今年秋天最火的外套，我先穿为敬！"（秋风落叶+外套特写，电影感画面）
【痛点】"每年换季都不知道买什么，去年的款式今年又过时了"（翻去年旧衣服）
【产品亮相】"这件XX短款皮衣，今年的大爆款"（皮衣全景→皮质光泽→内衬→五金细节）
【使用演示】"搭长裙→温柔飒姐｜搭牛仔裤→酷帅女孩"（室外街拍→咖啡店→日常通勤）
【信任背书】"预售就卖了5000件，每天都在补货"（销量截图）
【行动号召】"早秋限定价XX元，过了国庆恢复原价！"（倒计时+产品+限时价格标）`,
  },
];

/** 服饰品类特有的 prompt 指令 */
export const fashionPromptDirective = `
你正在为【服饰鞋包】品类创作短视频带货脚本。请注意以下要点：
1. 上身效果是核心：正面、侧面、背面、走路动态都要有镜头描述
2. 面料和做工细节要体现：质感、垂坠感、不起球不褪色等
3. 身材适配性是购买决策关键：突出显瘦/显高/遮肉/不挑身材等
4. 场景化展示：通勤、约会、逛街、度假等真实穿搭场景
5. 尺码覆盖要提及，降低用户的选择焦虑
6. 文案风格：时尚穿搭博主式，自信但不做作，给人"我也能穿出这个效果"的信心
7. 搭配建议增加购买连带率：上衣推荐搭配裤子，外套推荐搭配内搭
8. 季节感和潮流感要拿捏准确
`;
