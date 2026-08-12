# Scale Studio UI / UX、动效与 Vibe Coding 实践指南

> 想让 Codex 做出稳定、好看的 UI，关键不是反复说“更高级、更有设计感”，而是把工作方式改成：**设计语言 → 组件实验室 → 页面组合 → 响应式验收 → 动效验收**。

“一个组件一个组件做”是对的，但前面必须先有统一规则，后面必须有真实浏览器截图检查。否则每个组件单独看都不错，拼起来仍然会乱。

一句话概括：

> 灵感阶段可以 vibe coding；实现阶段必须 specification coding；最后必须 screenshot acceptance。

## 一、为什么 Codex 做出来总“差点意思”

通常不是模型完全没有审美，而是缺少以下上下文：

1. **不知道你的具体审美标准**
   “简洁、现代、高级”几乎没有约束力，不同人理解完全不同。

2. **不知道组件之间的共同规则**
   每次临时决定圆角、阴影、字号、间距，最后会像很多套 UI 拼在一起。

3. **只看到代码，看不到最终浏览器效果**
   CSS 逻辑正确，不代表视觉正确。

4. **一次修改范围太大**
   “重做整个编辑器页面”会同时改变布局、组件、颜色、响应式和交互，问题很难定位。

5. **没有明确的响应式合同**
   模型只实现了桌面截图，却不知道移动端是折叠、换行、隐藏，还是变成抽屉。

6. **动效没有意图**
   如果只说“加高级动效”，模型很容易给所有东西添加淡入、上浮和缩放，结果反而廉价。

Emil Kowalski 对 AI UI 的判断很准确：AI 能写动画代码，但不知道什么“感觉正确”；解决方法是把自己的判断拆成严格规则，分别写进 Skill。他甚至把 easing、duration、按钮反馈、弹层 origin 等做成了明确决策表。参见 [Agents with Taste](https://emilkowal.ski/ui/agents-with-taste)。

## 二、正确的工作顺序

### 第 1 步：先定义视觉方向，不写代码

不要让 Codex 一上来就改页面。先让它交付：

- 产品视觉关键词
- 参考产品拆解
- 色彩系统
- 字体层级
- 间距系统
- 圆角和阴影规则
- 页面密度
- 图标风格
- 禁止出现的设计模式
- 动效性格
- 桌面和移动端差异

参考图最好准备 3～5 张，每张明确说明：

- 我喜欢它的什么
- 不喜欢什么
- 借鉴布局、排版、色彩还是动效
- 哪些不能直接照搬

不要只说：

> 做得像 Linear 一点。

应该说：

> 借鉴 Linear 的信息层级：降低侧边栏对比度，让主工作区获得最高视觉权重；借鉴其紧凑工具栏和克制分割线，但不要使用它的紫色品牌语言。

Linear 自己总结过两个很值得借鉴的原则：“没有获得资格的元素，不要争夺注意力”以及“结构应当被感受到，而不是被大量边框直接画出来”。参见 [Linear UI refresh](https://linear.app/now/behind-the-latest-design-refresh)。

### 第 2 步：建立 Design Tokens

先固定一套变量，再做组件：

```text
颜色：
background / surface / elevated
text-primary / secondary / muted
border / accent / danger / success

字体：
display / title / heading / body / label / caption

间距：
4 / 8 / 12 / 16 / 24 / 32 / 48

圆角：
6 / 10 / 14 / full

动效：
fast 120ms
normal 200ms
slow 280ms
ease-enter
ease-exit
ease-move
```

这样以后让 Codex 修改按钮，它只能使用已有 token，不能临时发明一个 `#8472ff` 或 `17px` 间距。

Figma 的 Variables 本质上也是同一思想：用复用变量控制颜色、字体、间距、不同设备模式和多语言变化。参见 [Figma Variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)。

### 第 3 步：建立组件实验室

不要直接在正式页面里边看边改。建立一个内部组件展示页，例如：

```text
/dev/ui
```

里面集中展示：

- Button 全部尺寸和状态
- Input、Select、Slider
- Project Card
- Store Card
- Template Card
- Toolbar
- Sidebar
- Modal、Drawer、Toast
- Loading、Empty、Error
- 中文长文本、英文长文本
- 有图、无图、加载失败
- 手机宽度、平板宽度、桌面宽度

推荐顺序：

```text
Tokens
→ Button / Input / Icon
→ Card / Form / Navigation
→ Empty / Loading / Error
→ Editor Toolbar / Inspector / Canvas Shell
→ 页面组合
→ 动效
```

这就是“一个组件一个组件做”的正确版本。

Vercel 的官方 UI 生成建议也强调：大型应用应拆成增量任务；设计系统和组件 registry 能给 AI 稳定的 tokens 与组件上下文。参见 [v0 Prompting](https://api2.v0.dev/docs/text-prompting) 和 [v0 Design Systems](https://v0.dev/docs/design-systems)。

## 三、每个组件必须定义四份“合同”

### 1. 内容合同

- 最短文字是什么
- 最长文字是什么
- 中英文是否都支持
- 没有图片怎么办
- 数据为空怎么办
- 数字特别大怎么办

### 2. 尺寸合同

- 最小宽度
- 最大宽度
- 高度固定还是由内容撑开
- 哪些区域允许滚动
- 哪些区域允许换行
- 图片比例是什么

### 3. 状态合同

至少检查：

```text
default
hover
active
focus-visible
disabled
loading
selected
empty
error
```

### 4. 响应式合同

每个组件必须回答：

- 空间不足时，是压缩、换行、折叠还是隐藏？
- 按钮文字能否换行？
- 操作按钮什么时候进入 More 菜单？
- 左右布局什么时候变上下布局？
- 面板什么时候变成 Drawer？
- 触摸设备没有 hover 时怎么办？

Figma Auto Layout 的 Hug、Fill、Fixed、Wrap、Min/Max Width，其实就是在设计阶段定义这些合同。参见 [Figma Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties)。

## 四、如何减少越界和适配问题

建议把下面规则直接写进项目的 `AGENTS.md` 和设计 Skill。

### 必须遵守的布局规则

- Flex/Grid 子元素默认检查 `min-width: 0`
- 文本容器检查 `overflow-wrap: anywhere`
- 图片使用明确的 `aspect-ratio` 和 `object-fit`
- 图片、视频、SVG 不得超过父容器
- 页面内容优先使用 `width: 100%`，谨慎使用 `100vw`
- 少用固定宽度，多用 `minmax()`、`clamp()`、`max-width`
- 不依赖绝对定位完成主要页面布局
- 动效元素必须有明确的 containing block
- 绝对定位装饰元素必须限制移动范围
- 移动端不能仅靠缩小桌面版解决
- `overflow-x: hidden` 只能作为最后保险，不能用来隐藏布局错误

一个比较稳的网格写法是：

```css
grid-template-columns:
  repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
```

可复用组件最好根据自身容器宽度变化，而不只是看整个屏幕宽度。Container Queries 正是为“组件放在侧边栏和主内容区都能自己适配”设计的。参见 [web.dev Container Queries](https://web.dev/learn/css/container-queries/)。

### 必测宽度

| 场景 | 宽度 |
| --- | ---: |
| 极窄手机 | 320px |
| 常见手机 | 375px |
| 大手机 | 430px |
| 平板 | 768px |
| 小笔记本 | 1024px |
| 普通桌面 | 1440px |
| 宽屏 | 1728px |

除此之外还要测：

- 浏览器缩放 200%
- 超长中文
- 超长英文连续字符串
- 系统字体加载失败
- 没有图片
- 触摸设备
- 键盘操作
- Reduced Motion

W3C 的 Reflow 建议也是页面在约 320 CSS 像素宽度下仍能正常重排，核心内容不应依赖水平滚动。参见 [W3C Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)。

## 五、不要让 Codex“凭感觉验收”

每轮修改都应该走这个闭环：

```text
实现一个小范围修改
→ 启动真实页面
→ 截取多个宽度
→ 找出实际问题
→ 只修已确认的问题
→ 再次截图
```

最好加入 Playwright 截图测试，为重要页面保存基准图。以后 Codex 修改样式，如果无意中让按钮偏移、面板变宽，就能自动发现。Playwright 原生支持 `toHaveScreenshot()` 做像素级视觉比较。参见 [Playwright Visual Comparisons](https://playwright.dev/docs/next/test-snapshots)。

Codex 官方也建议把项目标准、测试命令和工作方式写进 `AGENTS.md`；清晰文档、真实环境和可靠测试会明显提高结果稳定性。参见 [OpenAI Codex](https://openai.com/index/introducing-codex/)。

## 六、动效应该怎样设计

先不要问“哪里可以加动画”，而是问：

> 用户完成这个动作以后，需要通过动画理解什么？

动效可以分成三层。

### 1. 功能反馈

最重要，也最应该先做：

- 按钮按下
- 上传成功
- 保存中／已保存
- 选中对象
- 表单错误
- 删除确认
- 权限变化
- 分享链接复制成功

### 2. 空间连续性

帮助用户理解对象去了哪里：

- 侧边栏打开／关闭
- Modal 从触发位置出现
- 卡片展开成详情
- Outline 与 Photo 视图切换
- 工具栏折叠进 More 菜单

### 3. 品牌型动效

只保留少量标志性效果：

- 首次进入
- 首页 Hero
- 模板空间展示
- 项目完成或导出
- 分享预览

产品编辑器不要到处做 ScrollTrigger。用户频繁操作的界面，响应速度比戏剧性更重要。复杂 GSAP 动效更适合品牌首页、模板展示页和少数叙事模块。

### 建议的时间规则

| 类型 | 建议时长 |
| --- | ---: |
| 按钮、Toggle、Hover | 100–150ms |
| Tooltip、Dropdown | 150–220ms |
| 面板、Popover | 180–260ms |
| Modal、Drawer | 220–300ms |
| 页面级过渡 | 300–500ms |

一般原则：

- 出现：ease-out
- 离开：可以更快
- 屏幕内位置变化：ease-in-out
- Hover：简单 ease
- 持续匀速运动：linear
- 高频操作：极短或完全不动
- 不要使用 `transition: all`
- 优先动画 `transform` 和 `opacity`
- 弹层不要从 `scale(0)` 开始，通常从 `0.95–0.98` 更自然

Emil 的经验是常规 UI 动画尽量保持在 300ms 以下；使用频率越高，动画越应该缩短甚至移除。参见 [Emil Design Skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)。

### Scale Studio 最值得做的动效

优先级如下：

1. **低保真轮廓图 ↔ 实拍图**
   同一坐标系内做 180–240ms crossfade，物料绝对不能跳位。

2. **画布对象选中**
   控制点出现、边框颜色变化、轻微 scale feedback，但不能妨碍拖拽。

3. **上传物料**
   拖入区域反馈、上传进度、成功进入画布。

4. **左右属性面板**
   使用短距离滑动加透明度，不做大幅飞入。

5. **自动保存**
   “保存中 → 已保存”做轻量状态变化，避免频繁 Toast。

6. **分享和复制链接**
   点击后即时反馈，必要时显示有效期和权限范围。

7. **首次使用引导**
   可以更有表现力，因为出现频率很低。

Reduced Motion 用户应保留信息反馈，但减少大范围位移、视差和缩放。Motion 和 GSAP 都有对应的 reduced-motion 与响应式处理方式。参见 [Motion Accessibility](https://motion.dev/docs/react-accessibility) 和 [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)。

## 七、适合 Scale Studio 的 Skill 组合

### 1. `gpt-taste`

适合：

- 首页、Landing Page
- 视觉方向探索
- 高级排版
- Bento 结构
- GSAP 叙事动效
- 避免普通 AI 模板感

但它偏向：

- 大字号 Editorial 页面
- 大面积留白
- AIDA 营销结构
- 强 ScrollTrigger 和视觉表达

所以它不适合直接统治整个 Scale Studio 编辑器。建议：

> 用 `gpt-taste` 做品牌首页和视觉概念；编辑器内部使用更克制的产品设计系统。

### 2. Emil Kowalski 的 UI Skills

这是一套很贴近本项目需求的公开 Skill，包括：

- `emil-design-eng`
- `animate`
- `review-animations`
- `improve-animations`
- `find-animation-opportunities`
- `prototype`
- `animation-vocabulary`

作者页面给出的安装方式是：

```bash
npx skills add emilkowalski/skill
```

详情参见 [AI Skills for Design Engineers](https://emilkowal.ski/skill)。建议先检查其内容和适用范围，再决定安装哪些 Skill，不要让所有 Skill 同时介入所有页面。

### 3. `browser:control-in-app-browser`

它不是提高审美的 Skill，但对本项目非常重要，因为它可以：

- 打开本地页面
- 调整真实窗口尺寸
- 点击和操作
- 截图
- 检查移动端表现
- 修改后重新验收

这能显著减少“代码改好了，页面却越界”的情况。

### 4. `imagegen`

适合：

- 品牌氛围图
- 背景纹理
- 空间场景图
- 首页视觉资产
- Moodboard
- 装饰位示意素材

不适合直接生成整个产品 UI 截图后硬照抄。

### 5. 自定义 `scale-studio-design` Skill

长期来看，这才是价值最高的。

里面应当固定：

```text
品牌视觉原则
产品界面原则
颜色和字体 tokens
组件清单
间距与圆角
编辑器布局规则
响应式规则
禁止模式
动效时长与 easing
浏览器截图矩阵
可访问性要求
Scale Studio 特有交互
```

OpenAI 对 Skill 的定位本身就是复用的指令、提示词和工作流模式。参见 [OpenAI Plugins and Skills](https://help.openai.com/en/articles/20001256-plugins-in-codex/)。

## 八、直接可用的提示词

### 1. 视觉方案阶段

```text
先不要写代码。

请作为产品设计师和 Design Engineer，审阅当前 Scale Studio。
目标不是做一个营销展示页，而是设计一个长期使用的空间尺寸预演工具。

请输出：
1. 当前视觉问题
2. 信息层级问题
3. 两个真正不同的视觉方向
4. 每个方向的字体、颜色、密度、圆角、阴影和图标建议
5. Design Tokens
6. 页面布局系统
7. 组件树
8. 全部组件状态
9. 320/375/768/1024/1440px 响应式策略
10. 动效原则与禁止使用的动效

不要使用“高级、现代、简洁”等无法验收的抽象描述。
每一条建议都要说明原因，并转化成可执行规则。
```

### 2. 单组件实现

```text
这次只实现 ProjectCard，不要重构其他页面。

必须包含：
default、hover、focus-visible、selected、loading、empty、error 状态。

内容测试：
短中文、长中文、长英文、无图片、图片加载失败。

响应式测试：
组件宽度 280、360、520、720px。
组件必须根据父容器适配，不得依赖页面 viewport。

只能使用现有 Design Tokens。
禁止临时增加颜色、阴影、圆角和间距值。

完成后启动页面并提供各宽度截图。
发现越界时必须修复根因，不得使用 overflow-x:hidden 掩盖。
```

### 3. 响应式审计

```text
不要重新设计页面，只做响应式和越界审计。

请在 320、375、430、768、1024、1440px 下检查：
1. 水平越界
2. Flex/Grid 子元素无法收缩
3. 固定宽度
4. 绝对定位元素越界
5. 中文和英文长文本
6. 图片比例
7. Toolbar 挤压
8. Modal/Drawer 高度
9. 200% zoom
10. 键盘 focus 是否被遮挡

先列出实际观察到的问题和根因，再逐项修改。
每轮修改后重新截图验证。
禁止通过全局 overflow-x:hidden 隐藏问题。
```

### 4. 动效设计

```text
先不要写动画代码。

请审阅这个交互，并分别说明：
1. 动画是否真的必要
2. 动画要传达什么信息
3. 触发条件
4. 起始和结束状态
5. duration
6. easing
7. transform-origin
8. 用户连续快速操作时如何中断
9. 移动端版本
10. prefers-reduced-motion 版本
11. 应使用 CSS、Motion 还是 GSAP

原则：
高频操作优先即时响应；
每个页面最多一个品牌型主动画；
其他动画只服务状态反馈或空间连续性。
```

### 5. 视觉 QA

```text
不要继续创作新设计。

请将当前实现与参考图并排比较，逐项检查：
字体、行高、字宽、对齐、间距、颜色、边框、阴影、
图标尺寸、信息密度、视觉重心、响应式和交互状态。

将问题按 P0/P1/P2 排序。
只修复能够从截图中确认的问题。
每完成一轮，重新截图并说明还剩什么差异。
```

## 九、建议建立的项目结构

```text
docs/
  design-system.md
  motion-spec.md
  responsive-matrix.md

src/
  styles/
    tokens.css
  components/
    ui/
  features/
    editor/
    projects/
    templates/
  dev/
    component-lab/

tests/
  visual/

AGENTS.md
```

其中：

- `AGENTS.md`：Codex 每次工作都必须遵守的工程和验收规则
- Design Skill：审美、组件、动效和工作流
- Component Lab：人工查看所有状态
- Playwright：自动检查视觉回归
- 浏览器截图：最终人工验收

## 十、最适合 Scale Studio 的整体方向

Scale Studio 实际上有两种界面性格，最好分开。

### 品牌与模板浏览部分

可以更有视觉表现力：

- 空间实拍大图
- 更强的排版
- 适度 GSAP
- 有品牌感的进入动画
- 场地切换和模板预览

### 编辑器工作区

必须克制、稳定、精确：

- 低干扰
- 高信息密度
- 清晰工具栏
- 稳定坐标系
- 动效短而功能化
- 画布永远是最高视觉权重
- 不让侧边栏、卡片和背景与画布争夺注意力

这是比“整个产品都做得炫”更成熟的方案。

## 十一、建议的实际执行顺序

真正开始执行时，先不要碰整个页面，依次完成：

1. Scale Studio 视觉方向板
2. Design Tokens
3. Component Lab
4. Editor Shell
5. 响应式截图矩阵
6. 动效规范
7. 最后组合完整页面

这样以后每一次让 Codex 修改 UI，失控、越界和适配错误都会少很多。
