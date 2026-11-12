# Revezone - 一款以图形为中心的思维管理工具
[English](README.md)

Revezone 正处于公测阶段，功能还有不少不足或者缺陷。如果你有任何问题或者建议，欢迎提交 [issue](https://github.com/revezone/revezone/issues/new) 进行反馈。

---

一款以图形为中心、轻量级、本地优先的用于构建第二大脑的效率工具。

![](https://img.alicdn.com/imgextra/i4/O1CN01hwzuBa1pHTtKjKHAE_!!6000000005335-2-tps-2952-1706.png)

## 赞助
[投喂猫粮（大陆用户）](https://github.com/korbinzhao/donate) 或 [买杯咖啡](https://www.buymeacoffee.com/korbinzhao)。

## 给个 Star
如果 Revezone 对你有帮助，请不要吝惜小手给个 Star ⭐ 吧 ☝️ 

## 使用 Revezone
* 线上体验版本（数据存储在浏览器）: https://revezone.com
* 桌面应用版本（数据存储在电脑端）: 
  * Github: https://github.com/revezone/revezone/releases
  * 百度云盘：https://pan.baidu.com/s/1MqCkuCSmJNSW_SrT4tDRxw?pwd=ajr9#list/path=%2Frevezone%E5%AE%89%E8%A3%85%E5%8C%85%E4%B8%8B%E8%BD%BD

## 反馈问题
Revezone 正处于公测阶段，功能还有不少不足或者缺陷。如果你有任何问题或者建议，欢迎提交 [issue](https://github.com/revezone/revezone/issues/new) 进行反馈。

## 产品特性
* Excalidraw 白板: 基于 Excalidraw 的无限画布白板
* Tldraw 白板：基于 Tldraw 的无限画布白板
* 笔记: 类 Notion 笔记
* 文件管理: 可拖拽目录树和标签页布局

### 桌面 AI 和版本历史

打开笔记或 Excalidraw 白板后，可在右侧与 AI 对话。明确的编辑指令会写入当前文档，主动建议需要点「应用」。人可以照常编辑。版本历史支持命名检查点、预览、恢复到原文档和恢复为副本。每次 AI 写入前都会先保存本地恢复点。历史保存在桌面应用数据目录的 `version-history` 下。

内置 Agent 默认使用本机 Ollama 的 `qwen3:4b-instruct-2507-q4_K_M`。启动 Ollama 并执行 `ollama pull qwen3:4b-instruct-2507-q4_K_M`。也可在「设置 → Agent」配置支持 Chat Completions 工具调用和结构化输出的服务，再测试连接。macOS 上保存的模型密钥通过系统钥匙串保护。

同一设置中可改用已安装并登录的 Codex CLI 或 Claude Code。CLI 会收到当前对话和文档上下文，生成回答、修改或建议，由 Revezone 校验并按相同的版本历史流程应用。对话中的社区技能由内置 Agent 提供。

从源码运行桌面版需要 Node.js 22.12 或更新版本：

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

从终端启动时，可用 `REVEZONE_AI_BASE_URL`、`REVEZONE_AI_MODEL` 和可选的 `REVEZONE_AI_API_KEY` 提供默认模型设置。应用内保存的设置优先。版本历史可离线使用。

### 社区检索

可在笔记或白板的「对话」中让内置 Agent 查社区，例如「GitHub 上有关于 Excalidraw 图片导出留白的讨论吗？」模型会判断是否检索、选择可用技能并生成搜索词。结果附原帖链接和发布时间。在笔记中可点击「将来源整理进笔记」，也可以直接要求「查完后把来源整理进当前笔记」。

在右侧「社区检索」中按关键词查找 GitHub 的公开 Issue 和 PR、Reddit 的公开帖子，或 X 最近 7 天的公开帖子。结果带原帖链接和发布时间，可勾选后整理进当前笔记。插入前会创建本地恢复点。Reddit 和 X 写入笔记的是链接和时间，帖子标题和摘要用于检索时浏览。

- **GitHub** 可直接搜索公开内容，也可用 `repo:owner/name` 限定仓库。需要更高的请求额度时，可在启动桌面端的环境中设置 `REVEZONE_GITHUB_TOKEN`。
- **Reddit** 需要 [获批的 Data API 权限](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data)。在启动桌面端的环境中配置 `REVEZONE_REDDIT_ACCESS_TOKEN`，或获批应用的 `REVEZONE_REDDIT_CLIENT_ID` 和 `REVEZONE_REDDIT_CLIENT_SECRET`，并按 [官方要求](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) 设置 `REVEZONE_REDDIT_USER_AGENT`。凭据由桌面主进程读取。
- **X** 使用 [官方最近搜索](https://docs.x.com/x-api/posts/search/quickstart/recent-search)。在启动桌面端的环境中设置应用的 `REVEZONE_X_BEARER_TOKEN`。可在对话中明确要求检索 X，也可以在手动搜索中勾选。[X API 按使用量计费](https://docs.x.com/x-api/getting-started/pricing)。
- **小红书** 可用当前关键词打开官方网站。复制笔记的原帖链接或整段分享文案，粘贴到「手动收录原帖」。日期和北京时间均可按原帖选填，只知道日期就只填日期，无法确认时留空。

社区检索可以独立使用，只向所选平台发送检索词。

### Excalidraw 白板
你可以在 Revezone 中以更简单的姿势使用 Excalidraw 功能，可以在桌面应用中自定义字体，也可以通过双链功能有效连接 Revezone 中的笔记。
![](https://img.alicdn.com/imgextra/i4/O1CN01TPddti1nbyNkT9Qkc_!!6000000005109-2-tps-2952-1706.png)

#### 在 Excalidraw 白板中自定义字体
Revezone 的画布支持用户自定义字体，不过目前只有桌面端应用支持画布自定义字体。

操作方法:
> 点击左侧边栏底部的设置按钮进行白板中的自定义字体设置。

![](https://img.alicdn.com/imgextra/i4/O1CN01nV2PVQ1Seck7HmCZ9_!!6000000002272-2-tps-2952-1706.png)

### Tldraw 白板
Revezone 新增 Tldraw 白板功能，给大家更多不一样的白板体验。
![](https://img.alicdn.com/imgextra/i3/O1CN01bB91Wp20SR8j33SvQ_!!6000000006848-2-tps-2952-1706.png)

### 笔记
Revezone 中的笔记是一个所见即所得的类 Notion 编辑器，支持 '/' 命令和 Markdown 语法。
![](https://img.alicdn.com/imgextra/i3/O1CN01HntrkK1WEIRHaHTHR_!!6000000002756-2-tps-2952-1706.png)

### 文件管理
你可以在左侧边栏创建和管理文件夹、笔记和画布，右键使用具体功能菜单。
![](https://img.alicdn.com/imgextra/i2/O1CN01ujED9U1MGS95qcnzI_!!6000000001407-2-tps-1158-776.png)

### 灵活布局
你可以通过拖拽的方式更改目录位置、标签页位置、分屏操作等。
![](https://img.alicdn.com/imgextra/i1/O1CN01JLe6m41mIRsdQ9JvR_!!6000000004931-2-tps-2952-1706.png)

## 关于仓库
该仓库只包含 Revezone 基础功能代码，和 revezone.com 和 Revezone 桌面应用提供的能力并不完全同步。

## 未来规划
更多产品特性开发中，敬请期待。你可以通过 [Twitter](https://twitter.com/wantianreve) 或者 [Bilibili](https://space.bilibili.com/393134139) 获取最新产品信息和开发背后的故事。

