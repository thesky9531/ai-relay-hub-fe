# ai-relay-hub-fe Interface Specification

> 前端与后端 BFF 层的契约。第三方厂商 API（OpenAI、字节即梦、Kling、Midjourney 等）的细节由后端封装 —— 厂商 key、限流、模型映射全部由后端处理，**前端不持有任何模型密钥**。

最后更新：2026-06-17 · 版本：v0（草稿，可继续讨论）

---

## 1. 通用约定

### 1.1 Base URL

| 环境 | URL |
|---|---|
| 开发 | `http://localhost:8000/api` |
| 生产 | `https://relay-hub.example.com/api` |

前端通过 `VITE_API_BASE` 注入，放在 `.env.local`（已在 `.gitignore` 忽略）。

### 1.2 命名 / 类型

- 字段一律 **camelCase**
- 时间字段：ISO 8601 字符串 `"2026-06-17T08:30:00Z"`
- 金额数字与单位字段独立：`{ value: 0.95, unit: "credit" }`
- **多语言字段统一**：`{ zh: string; en: string; ja: string }`，三键固定

### 1.3 鉴权

- 登录后下发 HttpOnly Cookie 或 Authorization Bearer Token（具体由后端拍板）
- 所有 `/api/*` 接口都需要登录态，除 `/api/auth/*`
- 前端不携带任何第三方厂商 key

### 1.4 通用响应包装

成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": { /* 接口具体返回 */ }
}
```

失败：

```json
{
  "code": 40001,
  "message": "余额不足，请充值后重试",
  "data": null
}
```

HTTP 状态码：
- `200` —— 业务请求送达（业务结果看 `code`）
- `401` —— 未登录
- `403` —— 无权限
- `5xx` —— 服务端异常

### 1.5 错误码分段

| 段 | 含义 |
|---|---|
| `0` | 成功 |
| `10000–10999` | 通用 / 鉴权 |
| `20000–20999` | 模型相关 |
| `30000–30999` | 生成任务相关 |
| `40000–40999` | 账户 / 计费 |

---

## 2. 模型 Models

### 2.1 `GET /models` · 模型列表

> 对应侧栏左侧的模型卡列表 + 顶部分类切换

**Query**

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `category` | string | 否 | `all` | `all` / `chat` / `image` / `video` / `audio` / `mine`（`mine` 返回当前用户收藏的） |
| `keyword` | string | 否 | — | 模型名 / 厂商模糊搜索（侧栏顶部搜索框） |
| `page` | number | 否 | `1` | |
| `pageSize` | number | 否 | `50` | |

**Response · `data`**

```ts
{
  items: Model[];
  total: number;
  pageInfo: { page: number; pageSize: number };
}

interface Model {
  id: string;              // 唯一 id，如 "jimeng"
  name: string;            // 模型展示名，如 "即梦 3.5 Pro"
  vendor: string;          // 厂商，如 "ByteDance"
  category: "chat" | "image" | "video" | "audio";
  description: { zh: string; en: string; ja: string };
  successRate: number;     // 0-1，最近 7 天成功率；前端展示 *100 + "%"
  iconUrl: string;         // 圆形 token 图标 URL（PNG/SVG）
  accentColor: string;     // hex 主题色，侧边卡彩条 + 中央 logo 背景用
  tags: string[];          // 能力标签，如 ["first-last-frame", "audio", "image-ref"]
  pricing: {
    min: number;
    max: number;
    unit: "credit";
    billingType: "per-clip" | "per-second" | "per-image" | "per-token";
  };
  status: "available" | "maintenance" | "beta";
  isFavorite: boolean;     // 对应 mine 分类
  updatedAt: string;
}
```

**示例**

```http
GET /api/models?category=video&page=1&pageSize=20
```

```json
{
  "code": 0, "message": "ok",
  "data": {
    "items": [
      {
        "id": "jimeng",
        "name": "即梦 3.5 Pro",
        "vendor": "ByteDance",
        "category": "video",
        "description": {
          "zh": "字节跳动即梦团队推出的高质量视频生成模型，支持首画同生、带环境音/动作音/背景音乐的有声视频。",
          "en": "Premium video generation with first-frame control, ambient sound, motion sound and BGM support.",
          "ja": "高品質な動画生成モデル。初期フレーム制御、環境音、動作音、BGM 付き動画に対応。"
        },
        "successRate": 1.0,
        "iconUrl": "https://cdn.example.com/models/jimeng.svg",
        "accentColor": "#22c6e8",
        "tags": ["first-last-frame", "audio", "4-12s"],
        "pricing": { "min": 0.9531, "max": 1.3863, "unit": "credit", "billingType": "per-clip" },
        "status": "available",
        "isFavorite": false,
        "updatedAt": "2026-06-15T08:30:00Z"
      }
    ],
    "total": 7,
    "pageInfo": { "page": 1, "pageSize": 20 }
  }
}
```

### 2.2 `GET /models/{modelId}/options` · 模型可选参数

> 用户选定模型后，拉取 composer 底部下拉的可选范围、上传槽位、prompt 限制。**不同模型返回不同 groups** —— 比如纯 chat 模型不返回 `frame` / `resolution` / `ratio` / `audio` / `duration`。

**Response · `data`**

```ts
{
  modelId: string;
  prompt: {
    supportNegative: boolean;
    minLength: number;
    maxLength: number;
    placeholder: { zh: string; en: string; ja: string };
  };
  assets: {
    firstFrame: AssetSlot;
    lastFrame: AssetSlot;
    reference: AssetSlot & { maxCount: number };
  };
  groups: OptionGroup[];
}

interface AssetSlot {
  supported: boolean;
  required: boolean;
  acceptMime?: string[];   // ["image/png", "image/jpeg"]
  maxSizeMB?: number;
}

interface OptionGroup {
  key: "quality" | "count" | "frame" | "duration" | "resolution" | "ratio" | "audio";
  icon: string;            // unicode glyph，如 "◷"
  label: { zh: string; en: string; ja: string };
  default: string;         // option.key
  options: Array<{
    key: string;
    label: { zh: string; en: string; ja: string };
    creditMultiplier?: number;     // 该选项对单价的倍数，前端可做实时预估
    disabled?: boolean;
    disabledReason?: { zh: string; en: string; ja: string };
  }>;
}
```

**示例**（截取 `jimeng` 的 duration 组，完整 7 组见 §7.2）

```http
GET /api/models/jimeng/options
```

```json
{
  "code": 0, "message": "ok",
  "data": {
    "modelId": "jimeng",
    "prompt": {
      "supportNegative": false,
      "minLength": 0,
      "maxLength": 1500,
      "placeholder": {
        "zh": "描述视频内容、动作和场景，可上传首帧或尾帧图片控制视频生成。支持 4-12 秒有声视频。",
        "en": "Describe content, actions and scene. Upload first/last frames to guide generation. 4-12s with audio.",
        "ja": "動画内容、動き、シーンを入力。最初または最後のフレーム画像で生成を制御できます。"
      }
    },
    "assets": {
      "firstFrame": { "supported": true, "required": false, "acceptMime": ["image/png", "image/jpeg"], "maxSizeMB": 10 },
      "lastFrame": { "supported": true, "required": false, "acceptMime": ["image/png", "image/jpeg"], "maxSizeMB": 10 },
      "reference": { "supported": false, "required": false, "maxCount": 0 }
    },
    "groups": [
      {
        "key": "duration",
        "icon": "◷",
        "label": { "zh": "时长", "en": "Duration", "ja": "時間" },
        "default": "4s",
        "options": [
          { "key": "4s", "label": { "zh": "4秒", "en": "4s", "ja": "4秒" }, "creditMultiplier": 1.0 },
          { "key": "8s", "label": { "zh": "8秒", "en": "8s", "ja": "8秒" }, "creditMultiplier": 1.8 },
          { "key": "12s", "label": { "zh": "12秒", "en": "12s", "ja": "12秒" }, "creditMultiplier": 2.6 }
        ]
      }
    ]
  }
}
```

### 2.3 `POST /models/{modelId}/favorite` · 收藏切换

**Body**

```json
{ "favorite": true }
```

**Response · `data`**

```json
{ "isFavorite": true }
```

---

## 3. 生成 Generation

### 3.1 `POST /uploads` · 文件上传

> 首帧 / 尾帧 / 参考图上传，返回 URL 供 `generate` 使用

**Body** （`multipart/form-data`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `file` | File | 文件 |
| `usage` | string | `first-frame` / `last-frame` / `reference` |

**Response · `data`**

```ts
{
  fileId: string;
  url: string;
  mimeType: string;
  size: number;          // bytes
  width?: number;
  height?: number;
  expiresAt: string;     // 临时 URL 过期时间
}
```

### 3.2 `POST /estimate` · 费用预估

> Composer 上方实时显示 `⚡0.9531~1.3863...` 区间。不真正扣 credit。

**Body**

```ts
{
  modelId: string;
  parameters: Record<string, string>;   // group.key -> option.key
}
```

**Response · `data`**

```ts
{
  estimatedCredits: { min: number; max: number; unit: "credit" };
  breakdown: Array<{ groupKey: string; optionKey: string; multiplier: number }>;
}
```

### 3.3 `POST /generate` · 提交生成任务

异步任务，返回 `taskId`。后续通过 `/tasks/{taskId}` 轮询，或订阅 WS（见 §8）。

**Body**

```ts
{
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  assets?: {
    firstFrame?: string;       // fileId 或 URL
    lastFrame?: string;
    references?: string[];
  };
  parameters: Record<string, string>;
  seed?: number;
  idempotencyKey?: string;     // 客户端生成 UUID，避免重复提交
}
```

**Response · `data`**

```ts
{
  taskId: string;
  status: "pending";
  estimatedCredits: { min: number; max: number; unit: "credit" };
  estimatedSeconds: number;
  createdAt: string;
}
```

**错误码**

| code | 含义 |
|---|---|
| `40001` | 余额不足 |
| `30001` | 模型维护中 |
| `30002` | 参数不合法 |
| `30003` | 上传文件解析失败 |
| `30004` | 频次限流 |

### 3.4 `GET /tasks/{taskId}` · 任务状态

**Response · `data`**

```ts
{
  taskId: string;
  modelId: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  progress: number;            // 0-1
  workIds: string[];           // 完成后填，count > 1 时多条
  errorCode?: number;
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
}
```

### 3.5 `GET /tasks` · 任务列表

> 顶部"任务列表"按钮

**Query**

| 字段 | 默认 | 说明 |
|---|---|---|
| `status` | `all` | `all` / `pending` / `running` / `completed` / `failed` |
| `page` / `pageSize` | `1` / `20` | |

**Response · `data`**

```ts
{
  items: TaskSummary[];
  total: number;
}

interface TaskSummary {
  taskId: string;
  modelId: string;
  modelName: string;
  status: string;
  progress: number;
  thumbnailUrl?: string;
  createdAt: string;
}
```

### 3.6 `POST /tasks/{taskId}/cancel` · 取消任务

**Response · `data`**

```json
{ "taskId": "task-xxx", "status": "canceled" }
```

---

## 4. 作品 Works

### 4.1 `GET /works` · 作品列表

> 我的作品页

**Query**

| 字段 | 默认 | 说明 |
|---|---|---|
| `category` | `all` | `all` / `video` / `image` / `audio` / `inspiration` |
| `modelId` | — | 按模型过滤 |
| `keyword` | — | 提示词模糊搜索 |
| `page` / `pageSize` | `1` / `20` | |

**Response · `data`**

```ts
{
  items: Work[];
  total: number;
}

interface Work {
  id: string;
  title: string;
  modelId: string;
  modelName: string;
  category: "video" | "image" | "audio" | "inspiration";
  thumbnailUrl: string;
  previewUrl?: string;              // 视频流 / 音频流
  fileUrl: string;                  // 下载链接
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  resolution?: string;
  ratio?: string;
  promptText: string;
  parameters: Record<string, string>;
  creditsConsumed: number;
  status: "completed" | "expired";
  isPinned: boolean;
  createdAt: string;
  expiresAt: string;                // 服务器保留到期（对应"作品 1-15 天清理"提示）
}
```

### 4.2 `GET /works/{workId}` · 作品详情

返回单个 `Work`。

### 4.3 `DELETE /works/{workId}` · 删除

软删除。

### 4.4 `POST /works/batch` · 批量操作

> 资产页"批量下载 / 导出链接 / 批量删除"

**Body**

```ts
{
  ids: string[];
  action: "download" | "export-link" | "delete";
}
```

**Response · `data`**

```ts
// action=download
{ archiveUrl: string; expiresAt: string }
// action=export-link
{ links: Array<{ workId: string; url: string; expiresAt: string }> }
// action=delete
{ deletedCount: number }
```

---

## 5. 灵感 / Prompt 建议

> 顶栏 ◌ 按钮 + 首页"作品库"灵感栏

### 5.1 `GET /inspirations`

**Query**

| 字段 | 说明 |
|---|---|
| `modelId` | 按当前模型过滤 |
| `category` | `video` / `image` / `audio` |
| `limit` | 默认 `12` |

**Response · `data`**

```ts
{
  items: Array<{
    id: string;
    promptText: { zh: string; en: string; ja: string };
    thumbnailUrl: string;
    modelIds: string[];                  // 适用的模型
    parameters?: Record<string, string>; // 推荐参数组合
    tags: string[];
  }>;
}
```

---

## 6. 账户 / 计费

### 6.1 `GET /me` · 用户信息

> 侧栏底部用户卡 + 作品页右侧 profile

```ts
{
  userId: string;
  nickname: string;
  avatarUrl: string;
  level: "standard" | "pro" | "team";
  phone: string;
  email: string | null;
  hasPassword: boolean;
  credits: number;
  cashBalance: number;
  callCount: number;
  storagePack: {
    active: boolean;
    expireAt: string | null;
    autoRenew: boolean;
  };
}
```

### 6.2 `POST /credits/recharge` · 充值

待后端协议确定（接入支付链路）。

### 6.3 `GET /credits/transactions` · 消费明细

待定。

---

## 7. Mock 数据（前端开发期）

建议放在 `src/mocks/`，dev 模式由 [MSW](https://mswjs.io/) 或 [vite-plugin-mock](https://github.com/vbenjs/vite-plugin-mock) 拦截，prod 由 `VITE_API_BASE` 切到真实后端。

文件分布建议：

```
src/mocks/
├── models.list.json                 # GET /models
├── model-options/
│   ├── jimeng.json                  # GET /models/jimeng/options
│   ├── sora.json
│   └── ...
├── works.list.json                  # GET /works
├── tasks.list.json                  # GET /tasks
└── me.json                          # GET /me
```

### 7.1 `models.list.json` 样本

```json
{
  "items": [
    {
      "id": "sora", "name": "Sora-2 Pro", "vendor": "OpenAI", "category": "video",
      "description": {
        "zh": "稳定版高质量视频生成，适合广告、叙事短片与产品演示。",
        "en": "Stable high-quality video for ads, narrative clips, product demos.",
        "ja": "広告、短編、商品デモに向いた安定した高品質動画生成。"
      },
      "successRate": 0.91,
      "iconUrl": "/icons/models/sora.svg",
      "accentColor": "#5a7bff",
      "tags": ["text-to-video", "image-to-video"],
      "pricing": { "min": 1.2, "max": 2.4, "unit": "credit", "billingType": "per-clip" },
      "status": "available",
      "isFavorite": false,
      "updatedAt": "2026-06-15T00:00:00Z"
    },
    {
      "id": "jimeng", "name": "即梦 3.5 Pro", "vendor": "ByteDance", "category": "video",
      "description": {
        "zh": "字节跳动即梦团队推出的高质量视频生成模型，支持首画同生、带环境音、动作音、背景音乐的有声视频，画质细腻流畅。",
        "en": "Premium video generation with first-frame control, ambient sound, motion sound and BGM.",
        "ja": "高品質な動画生成モデル。初期フレーム制御、環境音、動作音、BGM 付き動画に対応。"
      },
      "successRate": 1.0,
      "iconUrl": "/icons/models/jimeng.svg",
      "accentColor": "#22c6e8",
      "tags": ["first-last-frame", "audio", "4-12s"],
      "pricing": { "min": 0.9531, "max": 1.3863, "unit": "credit", "billingType": "per-clip" },
      "status": "available",
      "isFavorite": false,
      "updatedAt": "2026-06-15T08:30:00Z"
    },
    {
      "id": "midjourney", "name": "Midjourney V7", "vendor": "Midjourney", "category": "image",
      "description": {
        "zh": "商业视觉、海报与概念图生成。",
        "en": "Commercial visuals, posters and concept imagery.",
        "ja": "商用ビジュアル、ポスター、コンセプト画像生成。"
      },
      "successRate": 0.98,
      "iconUrl": "/icons/models/midjourney.svg",
      "accentColor": "#d7b56d",
      "tags": ["text-to-image", "stylize"],
      "pricing": { "min": 0.3, "max": 0.6, "unit": "credit", "billingType": "per-image" },
      "status": "available",
      "isFavorite": true,
      "updatedAt": "2026-06-10T00:00:00Z"
    }
  ],
  "total": 7,
  "pageInfo": { "page": 1, "pageSize": 20 }
}
```

### 7.2 `model-options/jimeng.json` 样本（完整 7 组）

```json
{
  "modelId": "jimeng",
  "prompt": {
    "supportNegative": false,
    "minLength": 0,
    "maxLength": 1500,
    "placeholder": {
      "zh": "描述视频内容、动作和场景，可上传首帧或尾帧图片控制视频生成。支持 4-12 秒有声视频。",
      "en": "Describe content, actions and scene. Upload first/last frames to guide generation. 4-12s with audio.",
      "ja": "動画内容、動き、シーンを入力。最初または最後のフレーム画像で生成を制御できます。"
    }
  },
  "assets": {
    "firstFrame": { "supported": true, "required": false, "acceptMime": ["image/png", "image/jpeg"], "maxSizeMB": 10 },
    "lastFrame":  { "supported": true, "required": false, "acceptMime": ["image/png", "image/jpeg"], "maxSizeMB": 10 },
    "reference":  { "supported": false, "required": false, "maxCount": 0 }
  },
  "groups": [
    {
      "key": "quality", "icon": "✦",
      "label": { "zh": "质量档位", "en": "Quality", "ja": "品質" },
      "default": "best",
      "options": [
        { "key": "best",  "label": { "zh": "综合最优", "en": "Balanced",     "ja": "総合最適" }, "creditMultiplier": 1.0 },
        { "key": "high",  "label": { "zh": "高质量",   "en": "High Quality", "ja": "高品質"   }, "creditMultiplier": 1.4 },
        { "key": "fast",  "label": { "zh": "高速度",   "en": "Fast",         "ja": "高速"     }, "creditMultiplier": 0.7 },
        { "key": "draft", "label": { "zh": "草稿预览", "en": "Draft",        "ja": "ドラフト" }, "creditMultiplier": 0.4 }
      ]
    },
    {
      "key": "count", "icon": "▱",
      "label": { "zh": "生成数量", "en": "Count", "ja": "生成数" },
      "default": "1",
      "options": [
        { "key": "1", "label": { "zh": "1条", "en": "1 clip",  "ja": "1件" }, "creditMultiplier": 1 },
        { "key": "2", "label": { "zh": "2条", "en": "2 clips", "ja": "2件" }, "creditMultiplier": 2 },
        { "key": "3", "label": { "zh": "3条", "en": "3 clips", "ja": "3件" }, "creditMultiplier": 3 },
        { "key": "4", "label": { "zh": "4条", "en": "4 clips", "ja": "4件" }, "creditMultiplier": 4 }
      ]
    },
    {
      "key": "frame", "icon": "▧",
      "label": { "zh": "帧控制", "en": "Frame Control", "ja": "フレーム制御" },
      "default": "both",
      "options": [
        { "key": "first",    "label": { "zh": "首帧",   "en": "First frame",  "ja": "先頭フレーム" } },
        { "key": "last",     "label": { "zh": "尾帧",   "en": "Last frame",   "ja": "末尾フレーム" } },
        { "key": "both",     "label": { "zh": "首尾帧", "en": "First & last", "ja": "首尾フレーム" } },
        { "key": "keyframe", "label": { "zh": "关键帧", "en": "Keyframes",    "ja": "キーフレーム" } },
        { "key": "none",     "label": { "zh": "关闭",   "en": "Off",          "ja": "オフ" } }
      ]
    },
    {
      "key": "duration", "icon": "◷",
      "label": { "zh": "时长", "en": "Duration", "ja": "時間" },
      "default": "4s",
      "options": [
        { "key": "4s",  "label": { "zh": "4秒",  "en": "4s",  "ja": "4秒"  }, "creditMultiplier": 1.0 },
        { "key": "5s",  "label": { "zh": "5秒",  "en": "5s",  "ja": "5秒"  }, "creditMultiplier": 1.2 },
        { "key": "6s",  "label": { "zh": "6秒",  "en": "6s",  "ja": "6秒"  }, "creditMultiplier": 1.4 },
        { "key": "8s",  "label": { "zh": "8秒",  "en": "8s",  "ja": "8秒"  }, "creditMultiplier": 1.8 },
        { "key": "10s", "label": { "zh": "10秒", "en": "10s", "ja": "10秒" }, "creditMultiplier": 2.2 },
        { "key": "12s", "label": { "zh": "12秒", "en": "12s", "ja": "12秒" }, "creditMultiplier": 2.6 }
      ]
    },
    {
      "key": "resolution", "icon": "◨",
      "label": { "zh": "分辨率", "en": "Resolution", "ja": "解像度" },
      "default": "1080p",
      "options": [
        { "key": "480p",  "label": { "zh": "480p",  "en": "480p",  "ja": "480p"  }, "creditMultiplier": 0.5 },
        { "key": "720p",  "label": { "zh": "720p",  "en": "720p",  "ja": "720p"  }, "creditMultiplier": 0.8 },
        { "key": "1080p", "label": { "zh": "1080p", "en": "1080p", "ja": "1080p" }, "creditMultiplier": 1.0 },
        { "key": "2k",    "label": { "zh": "2K",    "en": "2K",    "ja": "2K"    }, "creditMultiplier": 1.8 },
        { "key": "4k",    "label": { "zh": "4K",    "en": "4K",    "ja": "4K"    }, "creditMultiplier": 3.2 }
      ]
    },
    {
      "key": "ratio", "icon": "◇",
      "label": { "zh": "画面比例", "en": "Aspect Ratio", "ja": "アスペクト比" },
      "default": "16:9",
      "options": [
        { "key": "auto", "label": { "zh": "自适应",      "en": "Auto",          "ja": "自動"           } },
        { "key": "16:9", "label": { "zh": "宽屏 16:9",   "en": "16:9 Wide",     "ja": "16:9 ワイド"    } },
        { "key": "9:16", "label": { "zh": "竖屏 9:16",   "en": "9:16 Portrait", "ja": "9:16 縦"        } },
        { "key": "1:1",  "label": { "zh": "方形 1:1",    "en": "1:1 Square",    "ja": "1:1 正方形"     } },
        { "key": "4:3",  "label": { "zh": "传统 4:3",    "en": "4:3 Classic",   "ja": "4:3 クラシック" } },
        { "key": "3:4",  "label": { "zh": "竖式 3:4",    "en": "3:4 Portrait",  "ja": "3:4 縦"         } },
        { "key": "21:9", "label": { "zh": "电影 21:9",   "en": "21:9 Cinema",   "ja": "21:9 シネマ"    } }
      ]
    },
    {
      "key": "audio", "icon": "◈",
      "label": { "zh": "音频", "en": "Audio", "ja": "音声" },
      "default": "on",
      "options": [
        { "key": "on",  "label": { "zh": "有声", "en": "With audio", "ja": "音声あり" }, "creditMultiplier": 1.08 },
        { "key": "off", "label": { "zh": "无声", "en": "Muted",      "ja": "無音"      }, "creditMultiplier": 1.0 }
      ]
    }
  ]
}
```

### 7.3 `works.list.json` 样本

```json
{
  "items": [
    {
      "id": "work-1001",
      "title": "夜雨橱窗香水广告",
      "modelId": "jimeng",
      "modelName": "即梦 3.5 Pro",
      "category": "video",
      "thumbnailUrl": "/mocks/works/1001-thumb.jpg",
      "previewUrl": "/mocks/works/1001-preview.mp4",
      "fileUrl": "/mocks/works/1001.mp4",
      "fileSize": 18432000,
      "width": 1920, "height": 1080,
      "durationSeconds": 4,
      "resolution": "1080p",
      "ratio": "16:9",
      "promptText": "一支高级香水广告，黑曜石瓶身，雨夜玻璃橱窗，近景微距，电影级灯光。",
      "parameters": {
        "quality": "best", "count": "1", "frame": "both",
        "duration": "4s", "resolution": "1080p", "ratio": "16:9", "audio": "on"
      },
      "creditsConsumed": 1.16,
      "status": "completed",
      "isPinned": false,
      "createdAt": "2026-06-15T14:22:11Z",
      "expiresAt": "2026-06-22T14:22:11Z"
    },
    {
      "id": "work-1000",
      "title": "新品电商主图",
      "modelId": "midjourney",
      "modelName": "Midjourney V7",
      "category": "image",
      "thumbnailUrl": "/mocks/works/1000-thumb.jpg",
      "fileUrl": "/mocks/works/1000.png",
      "fileSize": 2840000,
      "width": 2048, "height": 2048,
      "resolution": "2k",
      "ratio": "1:1",
      "promptText": "极简白色背景，商品居中悬浮，柔和顶光，少量阴影。",
      "parameters": { "quality": "best", "ratio": "1:1" },
      "creditsConsumed": 0.42,
      "status": "completed",
      "isPinned": true,
      "createdAt": "2026-06-12T10:05:30Z",
      "expiresAt": "2026-06-19T10:05:30Z"
    }
  ],
  "total": 2,
  "pageInfo": { "page": 1, "pageSize": 20 }
}
```

### 7.4 `tasks.list.json` 样本

```json
{
  "items": [
    {
      "taskId": "task-9001", "modelId": "jimeng", "modelName": "即梦 3.5 Pro",
      "status": "running", "progress": 0.42,
      "createdAt": "2026-06-17T09:00:00Z"
    },
    {
      "taskId": "task-9000", "modelId": "sora", "modelName": "Sora-2 Pro",
      "status": "completed", "progress": 1.0,
      "thumbnailUrl": "/mocks/works/9000-thumb.jpg",
      "createdAt": "2026-06-17T08:00:00Z"
    },
    {
      "taskId": "task-8999", "modelId": "jimeng", "modelName": "即梦 3.5 Pro",
      "status": "failed", "progress": 0,
      "createdAt": "2026-06-17T07:14:00Z"
    }
  ],
  "total": 3
}
```

### 7.5 `me.json` 样本

```json
{
  "userId": "u-9741324",
  "nickname": "远去画眉",
  "avatarUrl": "/mocks/avatars/u-9741324.png",
  "level": "standard",
  "phone": "15513819531",
  "email": null,
  "hasPassword": true,
  "credits": 0.40,
  "cashBalance": 0,
  "callCount": 0,
  "storagePack": { "active": false, "expireAt": null, "autoRenew": false }
}
```

### 7.6 `POST /generate` mock 响应

```json
{
  "code": 0, "message": "ok",
  "data": {
    "taskId": "task-9002",
    "status": "pending",
    "estimatedCredits": { "min": 0.9531, "max": 1.3863, "unit": "credit" },
    "estimatedSeconds": 45,
    "createdAt": "2026-06-17T09:30:00Z"
  }
}
```

### 7.7 `POST /estimate` mock 响应

```json
{
  "code": 0, "message": "ok",
  "data": {
    "estimatedCredits": { "min": 0.9531, "max": 1.3863, "unit": "credit" },
    "breakdown": [
      { "groupKey": "duration",   "optionKey": "4s",    "multiplier": 1.0 },
      { "groupKey": "resolution", "optionKey": "1080p", "multiplier": 1.0 },
      { "groupKey": "ratio",      "optionKey": "16:9",  "multiplier": 1.0 },
      { "groupKey": "audio",      "optionKey": "on",    "multiplier": 1.08 },
      { "groupKey": "count",      "optionKey": "1",     "multiplier": 1 }
    ]
  }
}
```

---

## 8. 待定 / 后续

- **WebSocket 推送 vs 轮询**：任务进度推荐 WS（如 `/api/ws/tasks/{taskId}`），降级到 SSE 或 5s 轮询
- **团队空间 / 协作**（侧栏"团队空间"菜单项）—— 尚未设计
- **用户 API 密钥**（侧栏"API 密钥"菜单项）—— 用户对外调用本平台 API 的鉴权 token，设计待定
- **审核 / 内容安全**：是否在 `/generate` 同步做 prompt + 上传图片审核？
- **配额 / 限流**：单用户单模型 QPS 限制策略
- **WebHook**：完成后通知用户（企业场景）

---

## 9. 字段映射对照（现有前端 mock → API）

便于前端 `App.vue` 把现有 mock 改成 API 调用时快速对位。

| 前端字段 | API 字段 | 备注 |
|---|---|---|
| `studioModels[].id` | `Model.id` | 同 |
| `studioModels[].name` | `Model.name` | 同 |
| `studioModels[].vendor` | `Model.vendor` | 同 |
| `studioModels[].score` `"100%"` | `Model.successRate` `1.0` | 前端展示 `${score*100}%` |
| `studioModels[].category` | `Model.category` | 同 |
| `studioModels[].accent` | `Model.accentColor` | 同 |
| `studioModels[].desc` | `Model.description` | 同 |
| `composerOptionGroups[].key` | `OptionGroup.key` | 同 |
| `composerOptionGroups[].icon` | `OptionGroup.icon` | 同 |
| `composerOptionGroups[].default` | `OptionGroup.default` | 同 |
| `composerOptionGroups[].options[].key` | `OptionGroup.options[].key` | 同 |
| `composerOptionGroups[].options[].label.{zh,en,ja}` | `OptionGroup.options[].label` | 同 |
