# UI Style Atlas · UI 风格图鉴

> 195 套 UI 风格，12 种语言，明暗两套主题。每套都带设计令牌、AI 提示词与 DESIGN.md、组件预览、指针交互和常见问题。

本项目合并了两个来源：

- **[StyleKit](https://github.com/AnxForever/stylekit)**（MIT）— 151 套带设计令牌与 AI 规则的系统化风格，去掉与原创集重名的 19 套后收录 132 套
- **UI/UX Pro Max 原创集** — 57 个独立现场演示页面（`styles/`）
- **2026 精选参考** — 6 套策展风格，取自 [liquid-glass-react](https://github.com/rdev/liquid-glass-react) 与 Dribbble 上的真实产品案例

## 功能

| 能力 | 说明 |
| --- | --- |
| 12 种语言 | 简体中文、繁體中文、English、日本語、한국어、Deutsch、Español、Português、Italiano、العربية、Русский、Français；首次访问按浏览器语言初始化，阿拉伯语自动切换 RTL |
| 明暗主题 | 默认跟随系统（auto），可切换 白天 / 暗黑 / 跟随系统，选择记忆在本机 |
| 检索与筛选 | 关键词搜索（名称/描述/颜色/标签/场景）、8 个分类、3 个来源、3 种排序 |
| 风格详情 | 每套风格都有：组件预览、指针交互、评分与反馈、AI 实现（文本 / MD）、常见问题 |
| 组件预览 | 用该风格的令牌实时渲染卡片、按钮、输入框、徽章、开关与标签页，可切换浅色/深色表面 |
| 指针交互 | 聚光表面、磁吸按钮、3D 倾斜卡片、涟漪按压，全部由同一套令牌着色 |
| AI 实现 | 一键复制提示词或完整 `DESIGN.md`（含令牌表、组件 CSS、动效、Do/Don't、验收清单），另有 Tailwind 与 React 示例 |
| 原创演示 | 57 个原有独立页面仍保留，可从卡片或详情页直接打开 |

## 目录结构

```
uitest/
├── index.html                 # 风格图鉴首页（检索 / 筛选 / 语言 / 主题）
├── style.html                 # 风格详情页（?s=<style-id>）
├── assets/
│   ├── app.css                # 设计系统：布局、卡片、详情页、弹窗、双主题变量
│   ├── i18n.js                # 12 种语言字典与语言元数据
│   ├── app.js                 # 主题、语言、页头页脚、语言弹窗、卡片网格
│   ├── style-page.js          # 详情页五大板块、提示词 / MD / 代码生成
│   └── data/catalog.js        # 合并后的样式目录（195 条）
└── styles/                    # 原有 57 个独立风格演示页
```

`assets/data/catalog.js` 是数据快照：StyleKit 目录字段（名称、描述、配色、标签、Do/Don't）与原创集的配色、演示页路径合并，并按名称去重。修改数据后重新打开页面即可生效，无需构建。

## 本地预览

```bash
# 任选一种静态服务器
python -m http.server 8123
# 或
npx serve .
```

打开 <http://127.0.0.1:8123/index.html>。直接双击 `index.html` 也能运行，但用 `file://` 打开时部分浏览器会限制剪贴板与字体加载。

### 深链接

```
index.html?lang=ja&theme=dark      # 指定语言与主题
style.html?s=neubrutalism         # 指定风格（支持 StyleKit slug 别名与名称前缀）
```

## 部署

纯静态站点，无构建步骤：

- **GitHub Pages**：Settings → Pages → Source 选 `main`
- **Netlify / Cloudflare Pages**：直接拖入整个目录
- 自定义域名：`CNAME` 已指向 `uitest.opkg.cn`

## 浏览器支持

需要支持 CSS 自定义属性、`backdrop-filter`、`color-mix()` 与 `:has`/逻辑属性的现代浏览器（Chrome/Edge 111+、Safari 16.4+、Firefox 113+）。动效遵循 `prefers-reduced-motion`，主题遵循 `prefers-color-scheme`。

## 授权与致谢

- 代码：MIT
- 风格数据：[StyleKit](https://github.com/AnxForever/stylekit)，MIT
- 液态玻璃参考：[rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react)，MIT
- 策展参考：Dribbble 上的 ClauseOS（RonDesignLab）、Vexto、TripAI、Dark Bento Glow、AI Search Intelligence 等公开作品，仅用于设计语言描述，未复制其素材

<p align="center"><sub>StyleKit × UI/UX Pro Max · 合并重建</sub></p>
