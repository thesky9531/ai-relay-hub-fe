<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const activeLocale = ref('zh')
const showAuthModal = ref(false)
const isAuthenticated = ref(false)
const activeView = ref('home')
const countdown = ref(0)
const activeStudioCategory = ref('video')
const activeStudioModel = ref('jimeng')
const isToolMenuOpen = ref(false)
const isSidebarCollapsed = ref(false)
const activeAssetTab = ref(0)
const isBatchMode = ref(false)
const authForm = ref({
  phone: '',
  code: '',
  username: '',
  password: '',
})
const authMode = ref('password')
const captcha = ref({ id: '', question: '', answer: '' })
const authLoading = ref(false)
const authError = ref('')
const API_BASE = 'http://localhost:8080/api/v1'

const locales = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'EN' },
  { key: 'ja', label: '日本語' },
]

const studioCategories = [
  { key: 'all', icon: '◇' },
  { key: 'chat', icon: '◌' },
  { key: 'image', icon: '▧' },
  { key: 'video', icon: '▶' },
  { key: 'audio', icon: '♪' },
  { key: 'mine', icon: '●' },
]

const studioModels = [
  {
    id: 'sora',
    name: 'Sora-2 Pro',
    vendor: 'OpenAI',
    score: '91%',
    category: 'video',
    accent: '#5a7bff',
    desc: {
      zh: '稳定版高质量视频生成，适合广告、叙事短片与产品演示。',
      en: 'Stable high-quality video generation for ads, narrative clips and product demos.',
      ja: '広告、短編映像、商品デモに向いた安定した高品質動画生成。',
    },
  },
  {
    id: 'seedance',
    name: 'SD 2.0 参考生',
    vendor: 'Seedance',
    score: '100%',
    category: 'video',
    accent: '#20d6a2',
    desc: {
      zh: '多图参考与细腻动效，适合风格统一的连续视频。',
      en: 'Multi-image references and refined motion for consistent video styles.',
      ja: '複数画像参照と繊細な動きで、一貫した動画表現に適しています。',
    },
  },
  {
    id: 'grok3',
    name: 'grok-video-3',
    vendor: 'xAI',
    score: '100%',
    category: 'video',
    accent: '#e7eef7',
    desc: {
      zh: '高效图生视频模型，适合社媒短内容和快速实验。',
      en: 'Efficient image-to-video model for social clips and fast experiments.',
      ja: 'SNS 短尺動画や高速な試作に向いた画像から動画モデル。',
    },
  },
  {
    id: 'grok35',
    name: 'grok-video-3.5',
    vendor: 'xAI',
    score: '97%',
    category: 'video',
    accent: '#f7f7f2',
    desc: {
      zh: '更强镜头理解与图像保持，适合上传素材二次生成。',
      en: 'Stronger camera understanding and image consistency for uploaded assets.',
      ja: 'カメラ理解と画像保持に優れ、素材アップロード後の再生成に適しています。',
    },
  },
  {
    id: 'jimeng',
    name: '即梦 3.5 Pro',
    vendor: 'ByteDance',
    score: '100%',
    category: 'video',
    accent: '#22c6e8',
    desc: {
      zh: '字节跳动即梦团队推出的高质量视频生成模型，支持首画同生、可生成带有环境音、动作音、背景音乐的有声视频，画质细腻流畅。',
      en: 'A premium video generation model with first-frame control, ambient sound, motion sound and background music support.',
      ja: '高品質な動画生成モデル。初期フレーム制御、環境音、動作音、BGM 付き動画に対応します。',
    },
  },
  {
    id: 'keling',
    name: '可灵-Omni 参考生',
    vendor: 'Kling',
    score: '100%',
    category: 'video',
    accent: '#33df86',
    desc: {
      zh: '多模态参考生成，适合人像、产品与剧情素材延展。',
      en: 'Multimodal reference generation for portraits, products and story assets.',
      ja: '人物、商品、ストーリー素材の拡張に向いたマルチモーダル参照生成。',
    },
  },
  {
    id: 'midjourney',
    name: 'Midjourney V7',
    vendor: 'Midjourney',
    score: '98%',
    category: 'image',
    accent: '#d7b56d',
    desc: {
      zh: '商业视觉、海报与概念图生成。',
      en: 'Commercial visuals, posters and concept imagery.',
      ja: '商用ビジュアル、ポスター、コンセプト画像生成。',
    },
  },
]

const composerOptionGroups = [
  {
    key: 'quality',
    icon: '✦',
    options: [
      { key: 'best', label: { zh: '综合最优', en: 'Balanced', ja: '総合最適' } },
      { key: 'high', label: { zh: '高质量', en: 'High Quality', ja: '高品質' } },
      { key: 'fast', label: { zh: '高速度', en: 'Fast', ja: '高速' } },
      { key: 'draft', label: { zh: '草稿预览', en: 'Draft', ja: 'ドラフト' } },
    ],
    default: 'best',
  },
  {
    key: 'count',
    icon: '▱',
    options: [
      { key: '1', label: { zh: '1条', en: '1 clip', ja: '1件' } },
      { key: '2', label: { zh: '2条', en: '2 clips', ja: '2件' } },
      { key: '3', label: { zh: '3条', en: '3 clips', ja: '3件' } },
      { key: '4', label: { zh: '4条', en: '4 clips', ja: '4件' } },
    ],
    default: '1',
  },
  {
    key: 'frame',
    icon: '▧',
    options: [
      { key: 'first', label: { zh: '首帧', en: 'First frame', ja: '先頭フレーム' } },
      { key: 'last', label: { zh: '尾帧', en: 'Last frame', ja: '末尾フレーム' } },
      { key: 'both', label: { zh: '首尾帧', en: 'First & last', ja: '首尾フレーム' } },
      { key: 'keyframe', label: { zh: '关键帧', en: 'Keyframes', ja: 'キーフレーム' } },
      { key: 'none', label: { zh: '关闭', en: 'Off', ja: 'オフ' } },
    ],
    default: 'both',
  },
  {
    key: 'duration',
    icon: '◷',
    options: [
      { key: '4s', label: { zh: '4秒', en: '4s', ja: '4秒' } },
      { key: '5s', label: { zh: '5秒', en: '5s', ja: '5秒' } },
      { key: '6s', label: { zh: '6秒', en: '6s', ja: '6秒' } },
      { key: '8s', label: { zh: '8秒', en: '8s', ja: '8秒' } },
      { key: '10s', label: { zh: '10秒', en: '10s', ja: '10秒' } },
      { key: '12s', label: { zh: '12秒', en: '12s', ja: '12秒' } },
    ],
    default: '4s',
  },
  {
    key: 'resolution',
    icon: '◨',
    options: [
      { key: '480p', label: { zh: '480p', en: '480p', ja: '480p' } },
      { key: '720p', label: { zh: '720p', en: '720p', ja: '720p' } },
      { key: '1080p', label: { zh: '1080p', en: '1080p', ja: '1080p' } },
      { key: '2k', label: { zh: '2K', en: '2K', ja: '2K' } },
      { key: '4k', label: { zh: '4K', en: '4K', ja: '4K' } },
    ],
    default: '1080p',
  },
  {
    key: 'ratio',
    icon: '◇',
    options: [
      { key: 'auto', label: { zh: '自适应', en: 'Auto', ja: '自動' } },
      { key: '16:9', label: { zh: '宽屏 16:9', en: '16:9 Wide', ja: '16:9 ワイド' } },
      { key: '9:16', label: { zh: '竖屏 9:16', en: '9:16 Portrait', ja: '9:16 縦' } },
      { key: '1:1', label: { zh: '方形 1:1', en: '1:1 Square', ja: '1:1 正方形' } },
      { key: '4:3', label: { zh: '传统 4:3', en: '4:3 Classic', ja: '4:3 クラシック' } },
      { key: '3:4', label: { zh: '竖式 3:4', en: '3:4 Portrait', ja: '3:4 縦' } },
      { key: '21:9', label: { zh: '电影 21:9', en: '21:9 Cinema', ja: '21:9 シネマ' } },
    ],
    default: '4:3',
  },
  {
    key: 'audio',
    icon: '◈',
    options: [
      { key: 'on', label: { zh: '有声', en: 'With audio', ja: '音声あり' } },
      { key: 'off', label: { zh: '无声', en: 'Muted', ja: '無音' } },
    ],
    default: 'on',
  },
]

const initialConversations = [
  {
    id: 'conv-1002',
    promptText: '一只机械鸟在赛博朋克城市夜空飞翔，霓虹光与雨水反光，电影感运镜。',
    modelId: 'sora',
    modelName: 'Sora-2 Pro',
    accentColor: '#5a7bff',
    assets: { firstFrame: null, lastFrame: null },
    parameterLabels: ['综合最优', '1条', '8秒', '1080p', '宽屏 16:9', '有声'],
    status: 'running',
    progress: 0.42,
    estimatedCredits: { min: 1.8, max: 2.4 },
    createdAt: '2026-06-17T08:55:00Z',
  },
  {
    id: 'conv-1001',
    promptText: '一支高级香水广告，黑曜石瓶身，雨夜玻璃橱窗，近景微距，电影级灯光。',
    modelId: 'jimeng',
    modelName: '即梦 3.5 Pro',
    accentColor: '#22c6e8',
    assets: {
      firstFrame: 'https://picsum.photos/seed/conv-1001-ff/240/240',
      lastFrame: null,
    },
    parameterLabels: ['综合最优', '1条', '首帧', '4秒', '1080p', '宽屏 16:9', '有声'],
    status: 'completed',
    result: {
      type: 'video',
      thumbnailUrl: 'https://picsum.photos/seed/conv-1001-r/640/360',
      durationSeconds: 4,
    },
    creditsConsumed: 1.16,
    createdAt: '2026-06-17T08:30:00Z',
  },
  {
    id: 'conv-1000',
    promptText: '新品电商主图，极简白色背景，商品居中悬浮，柔和顶光，少量阴影。',
    modelId: 'midjourney',
    modelName: 'Midjourney V7',
    accentColor: '#d7b56d',
    assets: { firstFrame: null, lastFrame: null },
    parameterLabels: ['综合最优', '方形 1:1', '2K'],
    status: 'completed',
    result: {
      type: 'image',
      thumbnailUrl: 'https://picsum.photos/seed/conv-1000-r/600/600',
    },
    creditsConsumed: 0.42,
    createdAt: '2026-06-17T08:00:00Z',
  },
]

const translations = {
  zh: {
    pageTitle: 'AI Relay Hub',
    nav: {
      models: '模型',
      archive: '作品',
      credits: '额度',
    },
    actions: {
      enter: '进入控制台',
      start: '立即开始创作',
      models: '查看支持模型',
      reuse: '复用',
      close: '关闭',
      sendCode: '获取验证码',
      resend: '重新发送',
      submitLogin: '登录并进入',
      logout: '退出',
    },
    hero: {
      kicker: 'Unified AI Creation Gateway',
      title: '一个入口，调用全网热门 AI 生成模型',
      subtitle:
        '聚合视频生成、图片生成、图生视频、文生视频等多类 AI 能力。无需切换多个平台，选择模型、输入创意，即可生成并管理你的全部 AI 作品。',
    },
    capabilities: ['文生视频', '图生视频', '图片生成', '视频改写', '产品图', '动漫风格'],
    models: [
      { name: 'Veo', type: '视频生成', status: '推荐', cost: '18 credits' },
      { name: 'Kling', type: '图生视频', status: '热门', cost: '12 credits' },
      { name: 'Midjourney', type: '图片生成', status: '创意', cost: '6 credits' },
    ],
    visual: {
      route: '模型路由',
      prompt: '创意输入',
      promptText: '一支高级香水广告，黑曜石瓶身，雨夜玻璃橱窗，近景微距，电影级灯光。',
      archiveTitle: '作品库',
      archiveDesc: '提示词、参数、成本与文件自动归档',
      credits: '统一额度',
    },
    benefits: [
      {
        eyebrow: 'Model Routing',
        title: '多模型自由切换',
        text: '根据不同场景选择更适合的生成模型，广告、短视频、产品图、动漫风格都能灵活尝试。',
      },
      {
        eyebrow: 'Asset Archive',
        title: '作品自动归档',
        text: '生成结果、提示词、参数和消耗记录自动保存，方便下载、复用和二次创作。',
      },
      {
        eyebrow: 'Credit Control',
        title: '统一额度管理',
        text: '多个模型统一账户、统一额度、统一记录，创作成本更清晰。',
      },
    ],
    workspace: {
      kicker: 'Creative Operations',
      title: '从灵感到交付，所有生成资产集中管理',
    },
    works: [
      { title: '香水广告短片', meta: '图生视频 / 9:16 / 4K' },
      { title: '新品电商主图', meta: '图片生成 / 商拍风 / 1:1' },
      { title: '社媒开场动画', meta: '文生视频 / 5s / 电影感' },
    ],
    console: {
      title: '创作控制台',
      subtitle: '选择模型、输入提示词、统一查看额度与作品记录。',
      modelLabel: '生成模型',
      promptLabel: '创意提示词',
      promptPlaceholder: '描述画面、风格、比例、镜头语言和用途',
      costLabel: '预估消耗',
      costValue: '12 credits',
      create: '生成作品',
    },
    studio: {
      collapse: '收起',
      expand: '展开',
      subtitle: 'AI 大模型聚合平台',
      topTabs: ['大模型', '智能体', '灵感广场'],
      categories: {
        all: '全部',
        chat: '聊天',
        image: '图片',
        video: '视频',
        audio: '音频',
        mine: '我的',
      },
      search: '搜索模型或功能...',
      taskList: '任务列表',
      inspiration: '灵感',
      selectedModel: '当前模型',
      promptHint: '描述视频内容、动作和场景，可上传首帧或尾帧图片控制视频生成。支持 4-12 秒有声视频。',
      firstFrame: '首帧',
      lastFrame: '尾帧',
      send: '生成',
      recharge: '充值',
      online: '在线',
      menu: '应用菜单',
      menuItems: ['作品库', '额度明细', 'API 密钥', '团队空间'],
    },
    assets: {
      title: '我的作品',
      tabs: ['全部', '视频', '图片', '音频', '灵感'],
      selected: '已选择 0 项',
      bulkDownload: '批量下载',
      exportLink: '导出链接',
      bulkDelete: '批量删除',
      cancelBatch: '取消批量操作',
      enterBatch: '批量操作',
      notice: '温馨提示：作品在服务器保留时间有限（1~15天不等），请及时下载到本地保存～',
      empty: '暂无作品',
      profileTitle: '个人信息',
      userType: '普通用户',
      phone: '手机号',
      change: '换绑',
      email: '邮箱',
      unbound: '未绑定',
      bind: '绑定',
      password: '登录密码',
      set: '已设置',
      changePassword: '修改密码',
      credits: '算力余额',
      storage: '资源存储包',
      storageDesc: '开通后，有效期内您的作品和资源不会被清理。',
      unopened: '未开通',
      price: '服务价格',
      expire: '到期时间',
      autoRenew: '开启自动续费，到期自动扣 9.9 算力',
      openNow: '立即开通',
      cashBalance: '可提现余额',
      calls: '模型调用次数',
    },
    auth: {
      titleLogin: '登录后进入创作控制台',
      subtitle: '使用手机号接收验证码即可进入，后续可接入真实短信与账号体系。',
      login: '登录',
      codeLogin: '验证码登录',
      passwordLogin: '密码登录',
      username: '用户名',
      usernamePlaceholder: '请输入用户名',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      captchaLabel: '人机校验',
      captchaPlaceholder: '请输入计算结果',
      captchaRefresh: '点击刷新',
      captchaLoading: '加载中...',
      codeComingSoon: '验证码登录即将上线，请先使用密码登录',
      phone: '手机号',
      phonePlaceholder: '请输入手机号',
      code: '验证码',
      codePlaceholder: '6 位验证码',
      agreement: '登录或注册即代表你同意平台服务条款与隐私政策。',
      success: '已进入控制台',
    },
  },
  en: {
    pageTitle: 'AI Relay Hub',
    nav: {
      models: 'Models',
      archive: 'Assets',
      credits: 'Credits',
    },
    actions: {
      enter: 'Open Console',
      start: 'Start Creating',
      models: 'View Models',
      reuse: 'Reuse',
      close: 'Close',
      sendCode: 'Send Code',
      resend: 'Resend',
      submitLogin: 'Log In',
      logout: 'Log Out',
    },
    hero: {
      kicker: 'Unified AI Creation Gateway',
      title: 'One gateway to the most popular AI generation models',
      subtitle:
        'Bring video generation, image generation, image-to-video, text-to-video and more into one workspace. Choose a model, enter your idea, then generate and manage every AI asset without switching platforms.',
    },
    capabilities: ['Text to Video', 'Image to Video', 'Image Generation', 'Video Remix', 'Product Shots', 'Anime Style'],
    models: [
      { name: 'Veo', type: 'Video Generation', status: 'Recommended', cost: '18 credits' },
      { name: 'Kling', type: 'Image to Video', status: 'Trending', cost: '12 credits' },
      { name: 'Midjourney', type: 'Image Generation', status: 'Creative', cost: '6 credits' },
    ],
    visual: {
      route: 'Model Routing',
      prompt: 'Creative Prompt',
      promptText: 'A premium perfume ad, obsidian bottle, rainy night storefront, macro close-up, cinematic lighting.',
      archiveTitle: 'Asset Library',
      archiveDesc: 'Prompts, parameters, cost and files are archived automatically',
      credits: 'Unified Credits',
    },
    benefits: [
      {
        eyebrow: 'Model Routing',
        title: 'Switch models freely',
        text: 'Select the best model for each scenario, from ads and short videos to product images and anime-inspired visuals.',
      },
      {
        eyebrow: 'Asset Archive',
        title: 'Automatic asset archive',
        text: 'Generated files, prompts, parameters and usage records are saved for download, reuse and further creation.',
      },
      {
        eyebrow: 'Credit Control',
        title: 'Unified credit management',
        text: 'One account, one credit balance and one usage record across multiple models, making creative cost easier to control.',
      },
    ],
    workspace: {
      kicker: 'Creative Operations',
      title: 'Manage every generated asset from concept to delivery',
    },
    works: [
      { title: 'Perfume ad short', meta: 'Image to Video / 9:16 / 4K' },
      { title: 'E-commerce hero image', meta: 'Image Generation / Studio / 1:1' },
      { title: 'Social opening animation', meta: 'Text to Video / 5s / Cinematic' },
    ],
    console: {
      title: 'Creation Console',
      subtitle: 'Choose a model, write a prompt, and track credits and assets in one place.',
      modelLabel: 'Model',
      promptLabel: 'Prompt',
      promptPlaceholder: 'Describe the scene, style, ratio, camera language and usage',
      costLabel: 'Estimated Cost',
      costValue: '12 credits',
      create: 'Generate',
    },
    studio: {
      collapse: 'Collapse',
      expand: 'Expand',
      subtitle: 'AI model aggregation platform',
      topTabs: ['Models', 'Agents', 'Inspiration'],
      categories: {
        all: 'All',
        chat: 'Chat',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        mine: 'Mine',
      },
      search: 'Search models or tools...',
      taskList: 'Tasks',
      inspiration: 'Ideas',
      selectedModel: 'Selected model',
      promptHint: 'Describe the video content, actions and scene. Upload first or last frames to guide generation. Supports 4-12s videos with audio.',
      firstFrame: 'First',
      lastFrame: 'Last',
      send: 'Generate',
      recharge: 'Top Up',
      online: 'Online',
      menu: 'App Menu',
      menuItems: ['Asset Library', 'Credit Usage', 'API Keys', 'Team Space'],
    },
    assets: {
      title: 'My Assets',
      tabs: ['All', 'Video', 'Image', 'Audio', 'Ideas'],
      selected: '0 selected',
      bulkDownload: 'Download',
      exportLink: 'Export Links',
      bulkDelete: 'Delete',
      cancelBatch: 'Cancel Batch',
      enterBatch: 'Batch',
      notice: 'Reminder: assets are retained on the server for a limited time. Please download them locally in time.',
      empty: 'No assets yet',
      profileTitle: 'Profile',
      userType: 'Standard User',
      phone: 'Phone',
      change: 'Change',
      email: 'Email',
      unbound: 'Not bound',
      bind: 'Bind',
      password: 'Password',
      set: 'Set',
      changePassword: 'Change Password',
      credits: 'Credit Balance',
      storage: 'Asset Storage Pack',
      storageDesc: 'After activation, your assets and resources will not be cleaned during the validity period.',
      unopened: 'Inactive',
      price: 'Price',
      expire: 'Expires',
      autoRenew: 'Enable auto-renewal and deduct 9.9 credits at expiration',
      openNow: 'Activate',
      cashBalance: 'Withdrawable Balance',
      calls: 'Model Calls',
    },
    auth: {
      titleLogin: 'Log in to open the creation console',
      subtitle: 'Use your phone number and verification code to continue. Real SMS and account services can be connected later.',
      login: 'Log In',
      codeLogin: 'Code Login',
      passwordLogin: 'Password Login',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      captchaLabel: 'Human verification',
      captchaPlaceholder: 'Enter the result',
      captchaRefresh: 'Click to refresh',
      captchaLoading: 'Loading...',
      codeComingSoon: 'Code login coming soon. Please use password login.',
      phone: 'Phone',
      phonePlaceholder: 'Enter phone number',
      code: 'Code',
      codePlaceholder: '6-digit code',
      agreement: 'By continuing, you agree to the platform terms and privacy policy.',
      success: 'Console opened',
    },
  },
  ja: {
    pageTitle: 'AI Relay Hub',
    nav: {
      models: 'モデル',
      archive: '作品',
      credits: 'クレジット',
    },
    actions: {
      enter: 'コンソールへ',
      start: '今すぐ作成',
      models: '対応モデルを見る',
      reuse: '再利用',
      close: '閉じる',
      sendCode: 'コード送信',
      resend: '再送信',
      submitLogin: 'ログイン',
      logout: 'ログアウト',
    },
    hero: {
      kicker: 'Unified AI Creation Gateway',
      title: 'ひとつの入口から人気の AI 生成モデルを呼び出す',
      subtitle:
        '動画生成、画像生成、画像から動画、テキストから動画など複数の AI 機能を統合。複数のサービスを切り替えず、モデルを選び、アイデアを入力するだけで、すべての AI 作品を生成・管理できます。',
    },
    capabilities: ['テキスト動画', '画像から動画', '画像生成', '動画リミックス', '商品画像', 'アニメ風'],
    models: [
      { name: 'Veo', type: '動画生成', status: 'おすすめ', cost: '18 credits' },
      { name: 'Kling', type: '画像から動画', status: '人気', cost: '12 credits' },
      { name: 'Midjourney', type: '画像生成', status: 'クリエイティブ', cost: '6 credits' },
    ],
    visual: {
      route: 'モデルルーティング',
      prompt: 'プロンプト入力',
      promptText: '高級香水の広告。黒曜石のボトル、雨夜のショーウィンドウ、マクロ接写、映画的な照明。',
      archiveTitle: '作品ライブラリ',
      archiveDesc: 'プロンプト、パラメータ、コスト、ファイルを自動保存',
      credits: '統一クレジット',
    },
    benefits: [
      {
        eyebrow: 'Model Routing',
        title: '複数モデルを自由に切り替え',
        text: '広告、ショート動画、商品画像、アニメ風など、シーンに応じて最適な生成モデルを選べます。',
      },
      {
        eyebrow: 'Asset Archive',
        title: '作品を自動アーカイブ',
        text: '生成結果、プロンプト、パラメータ、消費記録を自動保存し、ダウンロードや再利用、二次制作に活用できます。',
      },
      {
        eyebrow: 'Credit Control',
        title: '統一クレジット管理',
        text: '複数モデルをひとつのアカウント、ひとつの残高、ひとつの利用履歴で管理し、制作コストを明確にします。',
      },
    ],
    workspace: {
      kicker: 'Creative Operations',
      title: 'アイデアから納品まで、生成アセットを一元管理',
    },
    works: [
      { title: '香水広告ショート', meta: '画像から動画 / 9:16 / 4K' },
      { title: '新商品 EC メイン画像', meta: '画像生成 / 商用撮影風 / 1:1' },
      { title: 'SNS オープニング動画', meta: 'テキスト動画 / 5s / シネマ風' },
    ],
    console: {
      title: '制作コンソール',
      subtitle: 'モデル選択、プロンプト入力、クレジットと作品管理をひとつに。',
      modelLabel: '生成モデル',
      promptLabel: 'プロンプト',
      promptPlaceholder: '画面、スタイル、比率、カメラ表現、用途を入力',
      costLabel: '想定消費',
      costValue: '12 credits',
      create: '生成する',
    },
    studio: {
      collapse: '折りたたむ',
      expand: '展開',
      subtitle: 'AI 大規模モデル統合プラットフォーム',
      topTabs: ['モデル', 'エージェント', 'インスピレーション'],
      categories: {
        all: 'すべて',
        chat: 'チャット',
        image: '画像',
        video: '動画',
        audio: '音声',
        mine: '自分',
      },
      search: 'モデルや機能を検索...',
      taskList: 'タスク',
      inspiration: 'ヒント',
      selectedModel: '選択中のモデル',
      promptHint: '動画内容、動き、シーンを入力。最初または最後のフレーム画像で生成を制御できます。4-12 秒の音付き動画に対応。',
      firstFrame: '先頭',
      lastFrame: '末尾',
      send: '生成',
      recharge: 'チャージ',
      online: 'オンライン',
      menu: 'アプリメニュー',
      menuItems: ['作品ライブラリ', 'クレジット明細', 'API キー', 'チーム空間'],
    },
    assets: {
      title: '自分の作品',
      tabs: ['すべて', '動画', '画像', '音声', 'ヒント'],
      selected: '0 件選択',
      bulkDownload: '一括ダウンロード',
      exportLink: 'リンク出力',
      bulkDelete: '一括削除',
      cancelBatch: '一括操作を解除',
      enterBatch: '一括操作',
      notice: 'お知らせ：作品のサーバー保存期間には制限があります。早めにローカルへ保存してください。',
      empty: '作品はまだありません',
      profileTitle: '個人情報',
      userType: '一般ユーザー',
      phone: '電話番号',
      change: '変更',
      email: 'メール',
      unbound: '未連携',
      bind: '連携',
      password: 'ログインパスワード',
      set: '設定済み',
      changePassword: '変更',
      credits: 'クレジット残高',
      storage: 'リソース保存パック',
      storageDesc: '有効期間中、作品とリソースは削除されません。',
      unopened: '未開通',
      price: '料金',
      expire: '期限',
      autoRenew: '自動更新を有効にし、期限時に 9.9 クレジットを差し引く',
      openNow: '今すぐ開通',
      cashBalance: '出金可能残高',
      calls: 'モデル呼び出し回数',
    },
    auth: {
      titleLogin: 'ログインして制作コンソールへ',
      subtitle: '電話番号に届く認証コードでログインできます。後から実際の SMS 基盤に接続できます。',
      login: 'ログイン',
      codeLogin: '認証コード',
      passwordLogin: 'パスワードログイン',
      username: 'ユーザー名',
      usernamePlaceholder: 'ユーザー名を入力',
      passwordLabel: 'パスワード',
      passwordPlaceholder: 'パスワードを入力',
      captchaLabel: '人間確認',
      captchaPlaceholder: '計算結果を入力',
      captchaRefresh: 'クリックして更新',
      captchaLoading: '読み込み中...',
      codeComingSoon: '認証コードログインは近日公開。パスワードログインをご利用ください。',
      phone: '電話番号',
      phonePlaceholder: '電話番号を入力',
      code: '認証コード',
      codePlaceholder: '6 桁のコード',
      agreement: '続行すると、利用規約とプライバシーポリシーに同意したものとみなされます。',
      success: 'コンソールを開きました',
    },
  },
}

const t = computed(() => translations[activeLocale.value])
const authTitle = computed(() => authMode.value === 'password' ? t.value.auth.titleLogin : t.value.auth.codeLogin)
const submitLabel = computed(() => authLoading.value ? '...' : t.value.actions.submitLogin)

// 打开登录弹窗时自动拉取验证码
watch(showAuthModal, (val) => {
  if (val && authMode.value === 'password') {
    fetchCaptcha()
  }
})
const filteredStudioModels = computed(() => {
  if (activeStudioCategory.value === 'all' || activeStudioCategory.value === 'mine') return studioModels
  return studioModels.filter((model) => model.category === activeStudioCategory.value)
})
const selectedStudioModel = computed(
  () => studioModels.find((model) => model.id === activeStudioModel.value) || studioModels[0],
)

const composerSelections = ref(
  Object.fromEntries(composerOptionGroups.map((group) => [group.key, group.default])),
)
const openComposerDropdown = ref(null)

function toggleComposerDropdown(key) {
  openComposerDropdown.value = openComposerDropdown.value === key ? null : key
}

function selectComposerOption(groupKey, optionKey) {
  composerSelections.value[groupKey] = optionKey
  openComposerDropdown.value = null
}

function composerSelectedLabel(group) {
  const option =
    group.options.find((opt) => opt.key === composerSelections.value[group.key]) || group.options[0]
  return option.label[activeLocale.value]
}

function handleDocumentClick(event) {
  if (!event.target.closest('.composer-option-wrap')) {
    openComposerDropdown.value = null
  }
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))

const promptText = ref('')
const firstFrameInput = ref(null)
const lastFrameInput = ref(null)
const firstFramePreview = ref(null)
const lastFramePreview = ref(null)
const conversations = ref([...initialConversations])

function triggerFramePick(slot) {
  const target = slot === 'first' ? firstFrameInput.value : lastFrameInput.value
  target?.click()
}

function onPickFrame(slot, event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (slot === 'first') firstFramePreview.value = reader.result
    else lastFramePreview.value = reader.result
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function clearFrame(slot, event) {
  event.stopPropagation()
  if (slot === 'first') firstFramePreview.value = null
  else lastFramePreview.value = null
}

function currentParameterLabels() {
  return composerOptionGroups
    .map((group) => {
      const selected = composerSelections.value[group.key]
      const option = group.options.find((o) => o.key === selected)
      return option?.label[activeLocale.value]
    })
    .filter(Boolean)
}

function submitGeneration() {
  const text = promptText.value.trim()
  if (!text) return
  const model = selectedStudioModel.value
  const id = `conv-${Date.now()}`
  const conv = {
    id,
    promptText: text,
    modelId: model.id,
    modelName: model.name,
    accentColor: model.accent,
    assets: {
      firstFrame: firstFramePreview.value,
      lastFrame: lastFramePreview.value,
    },
    parameterLabels: currentParameterLabels(),
    status: 'running',
    progress: 0,
    estimatedCredits: { min: 0.9531, max: 1.3863 },
    createdAt: new Date().toISOString(),
  }
  conversations.value.unshift(conv)
  promptText.value = ''
  firstFramePreview.value = null
  lastFramePreview.value = null
  openComposerDropdown.value = null

  window.setTimeout(() => {
    const target = conversations.value.find((c) => c.id === id)
    if (!target) return
    target.status = 'completed'
    target.result = {
      type: model.category === 'image' ? 'image' : 'video',
      thumbnailUrl: `https://picsum.photos/seed/${id}/640/360`,
      durationSeconds: model.category === 'video' ? 4 : null,
    }
    target.creditsConsumed = 1.12
  }, 3500)
}

function formatConvTime(iso) {
  try {
    const d = new Date(iso)
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  } catch {
    return ''
  }
}

watch(activeLocale, (locale) => {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en'
})

function requestInnerPage() {
  if (isAuthenticated.value) {
    activeView.value = 'console'
    return
  }
  showAuthModal.value = true
}

// ── 验证码登录（暂为 mock）──
function sendCode() {
  if (countdown.value > 0) return
  countdown.value = 60
  const timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(timer)
  }, 1000)
}

// ── 密码登录 ──
async function fetchCaptcha() {
  try {
    const res = await fetch(`${API_BASE}/auth/captcha`)
    const json = await res.json()
    if (json.code === 0 && json.data) {
      captcha.value.id = json.data.captcha_id
      captcha.value.question = json.data.question
      captcha.value.answer = ''
      authError.value = ''
    } else {
      authError.value = '获取验证码失败'
    }
  } catch {
    authError.value = '网络错误'
  }
}

async function doPasswordLogin() {
  if (!authForm.value.username || !authForm.value.password) {
    authError.value = '请输入用户名和密码'
    return
  }
  if (!captcha.value.answer) {
    authError.value = '请完成人机校验'
    return
  }
  authLoading.value = true
  authError.value = ''
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authForm.value.username,
        password: authForm.value.password,
        captcha_id: captcha.value.id,
        captcha_answer: captcha.value.answer,
      }),
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      localStorage.setItem('hub_token', json.data.token)
      isAuthenticated.value = true
      activeView.value = 'console'
      showAuthModal.value = false
      resetAuthForm()
    } else {
      authError.value = json.message || '登录失败'
      fetchCaptcha()
    }
  } catch {
    authError.value = '网络错误，请稍后重试'
    fetchCaptcha()
  } finally {
    authLoading.value = false
  }
}

function resetAuthForm() {
  authForm.value = { phone: '', code: '', username: '', password: '' }
  captcha.value = { id: '', question: '', answer: '' }
  authError.value = ''
}

function switchAuthMode(mode) {
  authMode.value = mode
  authError.value = ''
  captcha.value.answer = ''
  if (mode === 'password') {
    fetchCaptcha()
  }
}

function submitAuth() {
  if (authMode.value === 'password') {
    doPasswordLogin()
    return
  }
  // 验证码登录（暂时 mock）
  isAuthenticated.value = true
  activeView.value = 'console'
  showAuthModal.value = false
}

function openAssetsPage() {
  activeView.value = 'works'
  isToolMenuOpen.value = false
}

function backToStudio() {
  activeView.value = 'console'
}

function logout() {
  isAuthenticated.value = false
  activeView.value = 'home'
  isToolMenuOpen.value = false
  resetAuthForm()
  localStorage.removeItem('hub_token')
}
</script>

<template>
  <main v-if="isAuthenticated && activeView === 'works'" class="assets-shell">
    <section class="assets-main">
      <header class="assets-header">
        <button class="assets-back" type="button" @click="backToStudio">‹</button>
        <h1>{{ t.assets.title }}</h1>
        <nav class="assets-tabs" aria-label="Asset filters">
          <button
            v-for="(tab, index) in t.assets.tabs"
            :key="tab"
            type="button"
            :class="{ active: index === activeAssetTab }"
            @click="activeAssetTab = index"
          >
            {{ tab }}
          </button>
        </nav>
        <span class="assets-selected">{{ isBatchMode ? t.assets.selected : '' }}</span>
        <div class="assets-actions">
          <template v-if="isBatchMode">
            <button type="button" class="soft blue">↓ {{ t.assets.bulkDownload }}</button>
            <button type="button" class="soft purple">▱ {{ t.assets.exportLink }}</button>
            <button type="button" class="soft red">♧ {{ t.assets.bulkDelete }}</button>
            <button type="button" class="soft neutral" @click="isBatchMode = false">☑ {{ t.assets.cancelBatch }}</button>
          </template>
          <button v-else type="button" class="soft neutral" @click="isBatchMode = true">☑ {{ t.assets.enterBatch }}</button>
        </div>
      </header>

      <div class="assets-notice">
        <strong>*</strong>
        <span>{{ t.assets.notice }}</span>
        <button type="button">×</button>
      </div>

      <div class="assets-empty">
        <div class="empty-icon"></div>
        <p>{{ t.assets.empty }}</p>
      </div>
    </section>

    <aside class="profile-panel">
      <section class="profile-card">
        <header class="profile-title">
          <h2>{{ t.assets.profileTitle }}</h2>
          <span>ID: 9741324 ▢</span>
        </header>

        <div class="profile-identity">
          <span class="profile-avatar">远</span>
          <div>
            <strong>远去画眉</strong>
            <em>{{ t.assets.userType }}</em>
          </div>
        </div>

        <div class="profile-rows">
          <div class="profile-row">
            <span>{{ t.assets.phone }}</span>
            <strong>15513819531</strong>
            <button type="button">{{ t.assets.change }}</button>
          </div>
          <div class="profile-row">
            <span>{{ t.assets.email }}</span>
            <strong>{{ t.assets.unbound }}</strong>
            <button type="button">{{ t.assets.bind }}</button>
          </div>
          <div class="profile-row">
            <span>{{ t.assets.password }}</span>
            <strong>{{ t.assets.set }}</strong>
            <button type="button">{{ t.assets.changePassword }}</button>
          </div>
        </div>

        <div class="credit-row">
          <span>{{ t.assets.credits }}</span>
          <strong>⚡0.40</strong>
        </div>

        <div class="storage-pack">
          <div>
            <h3>{{ t.assets.storage }}</h3>
            <span>{{ t.assets.unopened }}</span>
          </div>
          <p>{{ t.assets.storageDesc }}</p>
          <dl>
            <div>
              <dt>{{ t.assets.price }}</dt>
              <dd>⚡9.90 / 月</dd>
            </div>
            <div>
              <dt>{{ t.assets.expire }}</dt>
              <dd>{{ t.assets.unopened }}</dd>
            </div>
          </dl>
          <label>
            <input type="checkbox" />
            <span>{{ t.assets.autoRenew }}</span>
          </label>
          <button type="button">{{ t.assets.openNow }}</button>
        </div>

        <div class="profile-summary-row">
          <span>{{ t.assets.cashBalance }}</span>
          <strong>¥0.00</strong>
        </div>
        <div class="profile-summary-row">
          <span>{{ t.assets.calls }}</span>
          <strong>0</strong>
        </div>
      </section>
    </aside>
  </main>

  <main
    v-else-if="isAuthenticated && activeView === 'console'"
    class="studio-shell"
    :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
  >
    <aside class="studio-sidebar">
      <div class="studio-brand">
        <span class="studio-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" />
            <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" />
            <circle cx="12" cy="9" r="2" />
            <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47" />
            <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1" />
            <path d="M9.5 18h5" />
            <path d="m8 22 4-11 4 11" />
          </svg>
        </span>
        <div>
          <strong>{{ t.pageTitle }}</strong>
          <p>{{ t.studio.subtitle }}</p>
        </div>
        <button
          type="button"
          :aria-label="isSidebarCollapsed ? t.studio.expand : t.studio.collapse"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
        >
          ‹
        </button>
      </div>

      <div class="studio-top-tabs">
        <button v-for="(tab, index) in t.studio.topTabs" :key="tab" type="button" :class="{ active: index === 0 }">
          <span>
            <svg v-if="index === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
              <path d="m7 16.5-4.74-2.85" />
              <path d="m7 16.5 5-3" />
              <path d="M7 16.5v5.17" />
              <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
              <path d="m17 16.5-5-3" />
              <path d="m17 16.5 4.74-2.85" />
              <path d="M17 16.5v5.17" />
              <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
              <path d="M12 8 7.26 5.15" />
              <path d="m12 8 4.74-2.85" />
              <path d="M12 13.5V8" />
            </svg>
            <svg v-else-if="index === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
              <path d="M20 2v4" />
              <path d="M22 4h-4" />
              <circle cx="4" cy="20" r="2" />
            </svg>
          </span>
          {{ tab }}
        </button>
      </div>

      <div class="studio-category-tabs">
        <button
          v-for="category in studioCategories"
          :key="category.key"
          type="button"
          :class="{ active: activeStudioCategory === category.key }"
          @click="activeStudioCategory = category.key"
        >
          {{ t.studio.categories[category.key] }}
        </button>
      </div>

      <label class="studio-search">
        <span>⌕</span>
        <input type="search" :placeholder="t.studio.search" />
      </label>

      <div class="studio-model-list">
        <button
          v-for="model in filteredStudioModels"
          :key="model.id"
          type="button"
          class="studio-model-card"
          :class="{ active: activeStudioModel === model.id }"
          @click="activeStudioModel = model.id"
        >
          <span class="model-token" :style="{ '--model-accent': model.accent }">
            {{ model.name.slice(0, 1) }}
          </span>
          <span class="model-copy">
            <strong>{{ model.name }}</strong>
            <em>{{ model.desc[activeLocale] }}</em>
          </span>
          <b>{{ model.score }}</b>
        </button>
      </div>

      <button class="studio-user-card" type="button" @click="openAssetsPage">
        <span class="user-avatar">远</span>
        <div>
          <strong>远去画眉</strong>
          <p><i></i>{{ t.studio.online }}</p>
        </div>
        <span class="recharge-chip">{{ t.studio.recharge }}</span>
      </button>
    </aside>

    <section class="studio-main">
      <button
        v-if="isSidebarCollapsed"
        class="sidebar-expand-button"
        type="button"
        :aria-label="t.studio.expand"
        @click="isSidebarCollapsed = false"
      >
        ›
      </button>

      <header class="studio-toolbar">
        <div class="studio-toolbar-left">
          <button class="task-pill" type="button">☷ {{ t.studio.taskList }}</button>
          <button class="idea-pill" type="button">◌</button>
        </div>

        <div class="studio-toolbar-right">
          <div class="language-switcher studio-language" aria-label="Language">
            <button
              v-for="locale in locales"
              :key="locale.key"
              type="button"
              :class="{ active: activeLocale === locale.key }"
              @click="activeLocale = locale.key"
            >
              {{ locale.label }}
            </button>
          </div>
          <div class="studio-menu-wrap">
            <button class="app-menu-button" type="button" :aria-label="t.studio.menu" @click="isToolMenuOpen = !isToolMenuOpen">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div v-if="isToolMenuOpen" class="studio-menu">
              <button v-for="item in t.studio.menuItems" :key="item" type="button" @click="item === t.studio.menuItems[0] && openAssetsPage()">{{ item }}</button>
              <button type="button" @click="logout">{{ t.actions.logout }}</button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="conversations.length === 0" class="studio-stage">
        <div class="studio-model-logo" :style="{ '--model-accent': selectedStudioModel.accent }">
          <span>{{ selectedStudioModel.name.slice(0, 1) }}</span>
        </div>
        <article class="studio-model-description">
          <p>{{ selectedStudioModel.desc[activeLocale] }}</p>
        </article>
      </div>

      <div v-else class="studio-conversation">
        <article
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-card"
          :class="`status-${conv.status}`"
        >
          <header class="conv-header">
            <span class="conv-avatar">U</span>
            <div class="conv-meta">
              <strong>You</strong>
              <em>{{ formatConvTime(conv.createdAt) }}</em>
            </div>
          </header>

          <div class="conv-body">
            <div
              v-if="conv.assets.firstFrame || conv.assets.lastFrame"
              class="conv-frames"
            >
              <figure v-if="conv.assets.firstFrame">
                <img :src="conv.assets.firstFrame" alt="first frame" />
                <figcaption>首帧</figcaption>
              </figure>
              <span v-if="conv.assets.firstFrame && conv.assets.lastFrame">→</span>
              <figure v-if="conv.assets.lastFrame">
                <img :src="conv.assets.lastFrame" alt="last frame" />
                <figcaption>尾帧</figcaption>
              </figure>
            </div>
            <p class="conv-prompt">{{ conv.promptText }}</p>
            <div class="conv-params">
              <span v-for="label in conv.parameterLabels" :key="label">{{ label }}</span>
            </div>
          </div>

          <div class="conv-reply">
            <span
              class="conv-avatar conv-model-avatar"
              :style="{ '--model-accent': conv.accentColor }"
            >
              {{ conv.modelName.slice(0, 1) }}
            </span>
            <div class="conv-reply-body">
              <header class="conv-reply-header">
                <strong>{{ conv.modelName }}</strong>
              </header>
              <div v-if="conv.status === 'running'" class="conv-running">
                <div class="conv-running-icon">
                  <span></span><span></span><span></span>
                </div>
                <span>
                  生成中… 预计 ⚡{{ conv.estimatedCredits.min }}~{{ conv.estimatedCredits.max }}
                </span>
              </div>
              <div v-else-if="conv.status === 'failed'" class="conv-failed">
                生成失败：{{ conv.errorMessage || '请稍后重试' }}
              </div>
              <div
                v-else-if="conv.status === 'completed' && conv.result"
                class="conv-result"
              >
                <div class="conv-thumb" :class="`type-${conv.result.type}`">
                  <img :src="conv.result.thumbnailUrl" :alt="`${conv.modelName} result`" />
                  <span v-if="conv.result.type === 'video'" class="conv-thumb-play">▶</span>
                  <span
                    v-if="conv.result.durationSeconds"
                    class="conv-thumb-duration"
                  >{{ conv.result.durationSeconds }}s</span>
                </div>
                <footer class="conv-result-footer">
                  <span class="conv-credits">⚡ {{ conv.creditsConsumed }}</span>
                  <button type="button">↓ 下载</button>
                  <button type="button">↻ 复用</button>
                </footer>
              </div>
            </div>
          </div>
        </article>
      </div>

      <form class="studio-composer" @submit.prevent="submitGeneration">
        <div class="composer-assets">
          <input
            ref="firstFrameInput"
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            @change="onPickFrame('first', $event)"
          />
          <input
            ref="lastFrameInput"
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            @change="onPickFrame('last', $event)"
          />
          <button
            type="button"
            :class="{ 'has-preview': firstFramePreview }"
            @click="triggerFramePick('first')"
          >
            <img v-if="firstFramePreview" :src="firstFramePreview" alt="" />
            <template v-else>
              <span>＋</span>
              {{ t.studio.firstFrame }}
            </template>
            <span
              v-if="firstFramePreview"
              class="composer-clear"
              @click="clearFrame('first', $event)"
            >×</span>
          </button>
          <b>→</b>
          <button
            type="button"
            :class="{ 'has-preview': lastFramePreview }"
            @click="triggerFramePick('last')"
          >
            <img v-if="lastFramePreview" :src="lastFramePreview" alt="" />
            <template v-else>
              <span>＋</span>
              {{ t.studio.lastFrame }}
            </template>
            <span
              v-if="lastFramePreview"
              class="composer-clear"
              @click="clearFrame('last', $event)"
            >×</span>
          </button>
        </div>
        <textarea v-model="promptText" :placeholder="t.studio.promptHint"></textarea>
        <div class="composer-meta">
          <div class="composer-options">
            <div
              v-for="group in composerOptionGroups"
              :key="group.key"
              class="composer-option-wrap"
              :class="{ accent: group.key === 'count' }"
            >
              <button
                type="button"
                :class="{ open: openComposerDropdown === group.key }"
                @click.stop="toggleComposerDropdown(group.key)"
              >
                <span class="composer-option-icon">{{ group.icon }}</span>
                {{ composerSelectedLabel(group) }}
                <span class="composer-option-caret">⌄</span>
              </button>
              <ul v-if="openComposerDropdown === group.key" class="composer-popover" @click.stop>
                <li
                  v-for="option in group.options"
                  :key="option.key"
                  :class="{ active: composerSelections[group.key] === option.key }"
                  @click="selectComposerOption(group.key, option.key)"
                >
                  {{ option.label[activeLocale] }}
                </li>
              </ul>
            </div>
          </div>
          <button class="composer-submit" type="submit">↑</button>
        </div>
      </form>
    </section>
  </main>

  <main v-else class="page-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="AI Relay Hub home">
        <span class="brand-mark">A</span>
        <span>{{ t.pageTitle }}</span>
      </a>

      <nav class="nav-links" aria-label="Main navigation">
        <a href="#models">{{ t.nav.models }}</a>
        <a href="#archive">{{ t.nav.archive }}</a>
        <a href="#credits">{{ t.nav.credits }}</a>
      </nav>

      <div class="header-tools">
        <div class="language-switcher" aria-label="Language">
          <button
            v-for="locale in locales"
            :key="locale.key"
            type="button"
            :class="{ active: activeLocale === locale.key }"
            @click="activeLocale = locale.key"
          >
            {{ locale.label }}
          </button>
        </div>
        <button v-if="isAuthenticated" class="header-action subtle" type="button" @click="logout">
          {{ t.actions.logout }}
        </button>
        <button v-else class="header-action" type="button" @click="requestInnerPage">
          {{ t.actions.enter }}
        </button>
      </div>
    </header>

    <section class="hero-section" id="start">
      <div class="hero-copy">
        <p class="section-kicker">{{ t.hero.kicker }}</p>
        <h1>{{ t.hero.title }}</h1>
        <p class="hero-subtitle">{{ t.hero.subtitle }}</p>

        <div class="hero-actions">
          <button class="button button-primary" type="button" @click="requestInnerPage">
            {{ t.actions.start }}
          </button>
          <a class="button button-secondary" href="#models">{{ t.actions.models }}</a>
        </div>

        <div class="capability-strip" aria-label="Capabilities">
          <span v-for="capability in t.capabilities" :key="capability">{{ capability }}</span>
        </div>
      </div>

      <div class="product-visual" aria-label="AI generation workspace preview">
        <div class="visual-topbar">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div class="visual-grid">
          <section class="visual-panel model-panel" id="models">
            <div class="panel-heading">
              <span>{{ t.visual.route }}</span>
              <strong>99.8%</strong>
            </div>
            <div class="model-list">
              <article v-for="model in t.models" :key="model.name" class="model-row">
                <div>
                  <strong>{{ model.name }}</strong>
                  <span>{{ model.type }}</span>
                </div>
                <p>{{ model.status }}</p>
                <em>{{ model.cost }}</em>
              </article>
            </div>
          </section>

          <section class="visual-panel prompt-panel">
            <div class="panel-heading">
              <span>{{ t.visual.prompt }}</span>
              <strong>Live</strong>
            </div>
            <p class="prompt-text">{{ t.visual.promptText }}</p>
            <div class="generation-meter">
              <span></span>
            </div>
          </section>

          <section class="visual-panel output-panel" id="archive">
            <div class="art-board">
              <span class="art-shape art-shape-one"></span>
              <span class="art-shape art-shape-two"></span>
              <span class="art-shape art-shape-three"></span>
            </div>
            <div>
              <strong>{{ t.visual.archiveTitle }}</strong>
              <p>{{ t.visual.archiveDesc }}</p>
            </div>
          </section>

          <section class="visual-panel credit-panel" id="credits">
            <div class="panel-heading">
              <span>{{ t.visual.credits }}</span>
              <strong>32,480</strong>
            </div>
            <div class="credit-chart">
              <span style="height: 44%"></span>
              <span style="height: 68%"></span>
              <span style="height: 52%"></span>
              <span style="height: 84%"></span>
              <span style="height: 60%"></span>
            </div>
          </section>
        </div>
      </div>
    </section>

    <section class="benefits-section" aria-label="Core benefits">
      <article v-for="benefit in t.benefits" :key="benefit.title" class="benefit-card">
        <p>{{ benefit.eyebrow }}</p>
        <h2>{{ benefit.title }}</h2>
        <span>{{ benefit.text }}</span>
      </article>
    </section>

    <section class="workspace-section" id="workspace">
      <div class="workspace-copy">
        <p class="section-kicker">{{ t.workspace.kicker }}</p>
        <h2>{{ t.workspace.title }}</h2>
      </div>

      <div class="work-list">
        <article v-for="work in t.works" :key="work.title" class="work-item">
          <span></span>
          <div>
            <strong>{{ work.title }}</strong>
            <p>{{ work.meta }}</p>
          </div>
          <button type="button" @click="requestInnerPage">{{ t.actions.reuse }}</button>
        </article>
      </div>
    </section>

    <div v-if="showAuthModal" class="modal-backdrop" role="presentation" @click.self="showAuthModal = false">
      <section class="auth-modal" role="dialog" aria-modal="true" :aria-label="authTitle">
        <button class="modal-close" type="button" :aria-label="t.actions.close" @click="showAuthModal = false">
          ×
        </button>

        <div class="auth-header">
          <p class="section-kicker">Account</p>
          <h2>{{ authTitle }}</h2>
          <span>{{ t.auth.subtitle }}</span>
        </div>

        <!-- Mode tabs -->
        <div class="auth-tabs">
          <button
            :class="{ active: authMode === 'password' }"
            @click="switchAuthMode('password')"
          >{{ t.auth.passwordLogin }}</button>
          <button
            :class="{ active: authMode === 'code' }"
            @click="switchAuthMode('code')"
          >{{ t.auth.codeLogin }}</button>
        </div>

        <!-- Error message -->
        <div v-if="authError" class="auth-error">{{ authError }}</div>

        <!-- Password login form -->
        <form v-if="authMode === 'password'" class="auth-form" @submit.prevent="submitAuth">
          <label>
            <span>{{ t.auth.username }}</span>
            <input v-model="authForm.username" type="text" :placeholder="t.auth.usernamePlaceholder" required />
          </label>

          <label>
            <span>{{ t.auth.passwordLabel }}</span>
            <input v-model="authForm.password" type="password" :placeholder="t.auth.passwordPlaceholder" required />
          </label>

          <label>
            <span>{{ t.auth.captchaLabel }}</span>
            <div class="captcha-field">
              <span class="captcha-question" @click="fetchCaptcha" :title="t.auth.captchaRefresh">
                {{ captcha.question || t.auth.captchaLoading }}
              </span>
              <input v-model="captcha.answer" type="text" inputmode="numeric" :placeholder="t.auth.captchaPlaceholder" required />
            </div>
          </label>

          <button class="button button-primary auth-submit" type="submit" :disabled="authLoading">{{ submitLabel }}</button>
          <p class="auth-agreement">{{ t.auth.agreement }}</p>
        </form>

        <!-- Code login form (stub, disabled) -->
        <form v-else class="auth-form" @submit.prevent="submitAuth">
          <p class="auth-coming-soon">{{ t.auth.codeComingSoon }}</p>
          <label>
            <span>{{ t.auth.phone }}</span>
            <input v-model="authForm.phone" type="tel" :placeholder="t.auth.phonePlaceholder" disabled />
          </label>

          <label>
            <span>{{ t.auth.code }}</span>
            <div class="code-field">
              <input v-model="authForm.code" type="text" inputmode="numeric" :placeholder="t.auth.codePlaceholder" disabled />
              <button type="button" disabled>{{ t.actions.sendCode }}</button>
            </div>
          </label>

          <button class="button button-primary auth-submit" type="submit" disabled>{{ submitLabel }}</button>
          <p class="auth-agreement">{{ t.auth.agreement }}</p>
        </form>
      </section>
    </div>
  </main>
</template>
