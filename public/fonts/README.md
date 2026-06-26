# 字幕字体 / Subtitle font

`subtitle.otf` 是 **Noto Sans CJK SC**（Google，SIL OFL 1.1，见 `OFL.txt`）的**子集**，
覆盖简体中文(GB2312) + 日文(JIS X 0208) + 韩文(KS X 1001) + 拉丁 + 常用标点（~14k 字形，2.7MB）。

`src/lib/video-composer/composer.ts` 的 `resolveChineseFontFile()` 优先用本字体，保证
**中/英/日/韩字幕在所有平台一致渲染**（系统字体因 OS 而异：macOS 的 PingFang/STHeiti 不含韩文谚文，会渲染成豆腐块）。

## 重新生成子集
全量 Noto CJK ~16MB，子集到常用字符集压到 2.7MB：

```bash
# 1) 下载全量统一 Noto Sans CJK（含 zh+ja+ko 字形）
curl -sL -o noto-cjk.otf \
  https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf

# 2) 生成字符集（GB2312 + JIS X 0208 + KS X 1001 + 拉丁/标点/假名/全角），见提交说明里的 python 片段
# 3) 子集化（需 fontTools）
python3 -m fontTools.subset noto-cjk.otf --text-file=chars.txt \
  --output-file=subtitle.otf --no-glyph-names --no-hinting --desubroutinize \
  --layout-features='' --name-IDs='1,2,3,4,6'
```

> ⚠️ 子集只含常用字（覆盖自然语言旁白 99.9%）；极生僻字可能缺字。如需全覆盖换全量 Noto CJK。
