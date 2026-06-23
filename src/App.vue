<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getModels, createGeneration, getGenerations, getAssets, getProfile, recharge, login as loginApi, setToken as saveToken, uploadAsset } from './api/index.js'

const activeLocale = ref('zh')
const showAuthModal = ref(false)
const isAuthenticated = ref(false)
const activeView = ref('home')
const activeStudioCategory = ref('video')
const activeStudioModel = ref('jimeng')
const isSidebarCollapsed = ref(false)
const activeAssetTab = ref(0)
const isBatchMode = ref(false)
const authForm = ref({
  username: '',
  password: '',
})
const authLoading = ref(false)
const authError = ref('')
const API_BASE = '/api/v1'

const locales = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'EN' },
  { key: 'ja', label: '日本語' },
]

const studioCategories = [
  { key: 'chat', icon: '◌' },
  { key: 'image', icon: '▧' },
  { key: 'video', icon: '▶' },
  { key: 'audio', icon: '♪' },
  { key: 'mine', icon: '●' },
]

const studioModels = ref([])
const profile = ref({})
const _unused_models = [
  {
    id: '_sora',
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
]

// ── 模型参数配置（按 provider_model_id）──────────────────────────
// 每个模型定义：groups（对话框选项组）+ toParams（选中值 → API 参数映射）

const RATIO_OPTIONS = [
  { key: '16:9', label: { zh: '宽屏 16:9', en: '16:9 Wide', ja: '16:9 ワイド' } },
  { key: '9:16', label: { zh: '竖屏 9:16', en: '9:16 Portrait', ja: '9:16 縦' } },
  { key: '1:1', label: { zh: '方形 1:1', en: '1:1 Square', ja: '1:1 正方形' } },
  { key: '4:3', label: { zh: '传统 4:3', en: '4:3 Classic', ja: '4:3 クラシック' } },
  { key: '3:4', label: { zh: '竖式 3:4', en: '3:4 Portrait', ja: '3:4 縦' } },
  { key: '21:9', label: { zh: '电影 21:9', en: '21:9 Cinema', ja: '21:9 シネマ' } },
]

const RATIO_OPTIONS_ADAPTIVE = [
  { key: 'adaptive', label: { zh: '自适应', en: 'Auto', ja: '自動' } },
  ...RATIO_OPTIONS,
]

const DUR_OPTIONS_4_12 = ['4','5','6','8','10','12'].map(k => ({ key: k, label: { zh: `${k}秒`, en: `${k}s`, ja: `${k}秒` } }))
const DUR_OPTIONS_4_15 = ['4','5','6','7','8','9','10','11','12','13','14','15'].map(k => ({ key: k, label: { zh: `${k}秒`, en: `${k}s`, ja: `${k}秒` } }))
const DUR_OPTIONS_1_15 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'].map(k => ({ key: k, label: { zh: `${k}秒`, en: `${k}s`, ja: `${k}秒` } }))
const DUR_OPTIONS_1_16 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'].map(k => ({ key: k, label: { zh: `${k}秒`, en: `${k}s`, ja: `${k}秒` } }))

const MODEL_PARAM_CONFIGS = {
  // SD 2.0 参考生
  'kwvideo-v2-ref': {
    imageMin: 1, imageMax: 9, imageLabel: { zh: '参考图(1-9张)', en: 'References (1-9)', ja: '参照画像(1-9枚)' },
    groups: [
      { key: 'version', icon: '⚡', options: [{ key:'标准',label:{zh:'标准',en:'Standard',ja:'標準'}},{ key:'快速',label:{zh:'快速',en:'Fast',ja:'高速'}}], default: '标准' },
      { key: 'duration', icon: '◷', options: [{ key:'auto',label:{zh:'自动',en:'Auto',ja:'自動'}},...DUR_OPTIONS_4_15], default: 'auto' },
      { key: 'aspect_ratio', icon: '◇', options: RATIO_OPTIONS_ADAPTIVE, default: 'adaptive' },
      { key: 'resolution', icon: '◨', options: [{ key:'480p',label:{zh:'480p',en:'480p',ja:'480p'}},{ key:'720p',label:{zh:'720p',en:'720p',ja:'720p'}}], default: '720p' },
    ],
    toParams(s, refUrls) {
      return { version: s.version||'标准', duration: s.duration||'auto', aspect_ratio: s.aspect_ratio||'adaptive', resolution: s.resolution||'720p', images: refUrls.length ? refUrls : undefined }
    },
  },
  // grok-video-3.5
  'grok-imagine-video-1.5-preview': {
    imageMin: 1, imageMax: 1, imageLabel: { zh: '首帧参考图(必填)', en: 'First frame (required)', ja: '先頭フレーム(必須)' },
    groups: [
      { key: 'aspect_ratio', icon: '◇', options: [{ key:'16:9',label:{zh:'宽屏 16:9',en:'16:9 Wide',ja:'16:9 ワイド'}},{ key:'9:16',label:{zh:'竖屏 9:16',en:'9:16 Portrait',ja:'9:16 縦'}},{ key:'1:1',label:{zh:'方形 1:1',en:'1:1 Square',ja:'1:1 正方形'}},{ key:'3:2',label:{zh:'3:2',en:'3:2',ja:'3:2'}},{ key:'2:3',label:{zh:'2:3',en:'2:3',ja:'2:3'}}], default: '16:9' },
      { key: 'resolution', icon: '◨', options: [{ key:'720p',label:{zh:'720p',en:'720p',ja:'720p'}},{ key:'480p',label:{zh:'480p',en:'480p',ja:'480p'}}], default: '720p' },
      { key: 'duration', icon: '◷', options: DUR_OPTIONS_1_15, default: '6' },
    ],
    toParams(s, refUrls) {
      return { aspect_ratio: s.aspect_ratio||'16:9', resolution: s.resolution||'720p', duration: s.duration||'6', images: refUrls }
    },
  },
  // 可灵-Omni 参考生
  'kling-v3-omni-cankao': {
    imageMin: 1, imageMax: 7, imageLabel: { zh: '参考图(1-7张)', en: 'References (1-7)', ja: '参照画像(1-7枚)' },
    groups: [
      { key: 'duration', icon: '◷', options: [{ key:'5',label:{zh:'5秒',en:'5s',ja:'5秒'}},{ key:'10',label:{zh:'10秒',en:'10s',ja:'10秒'}},{ key:'15',label:{zh:'15秒',en:'15s',ja:'15秒'}}], default: '5' },
      { key: 'mode', icon: '◈', options: [{ key:'std',label:{zh:'标准',en:'Standard',ja:'標準'}},{ key:'pro',label:{zh:'高品质',en:'Pro',ja:'高品質'}}], default: 'std' },
      { key: 'aspect_ratio', icon: '◇', options: [{ key:'16:9',label:{zh:'16:9',en:'16:9',ja:'16:9'}},{ key:'9:16',label:{zh:'9:16',en:'9:16',ja:'9:16'}},{ key:'1:1',label:{zh:'1:1',en:'1:1',ja:'1:1'}}], default: '16:9' },
    ],
    toParams(s, refUrls) {
      return { duration: s.duration||'5', mode: s.mode||'std', aspect_ratio: s.aspect_ratio||'16:9', images: refUrls.length ? refUrls : undefined }
    },
  },
  // 快乐马-参考生
  'happyhorse-r2v': {
    imageMin: 1, imageMax: 5, imageLabel: { zh: '参考图(1-5张)', en: 'References (1-5)', ja: '参照画像(1-5枚)' },
    groups: [
      { key: 'duration', icon: '◷', options: DUR_OPTIONS_4_15.filter(o => parseInt(o.key) >= 3), default: '5' },
      { key: 'resolution', icon: '◨', options: [{ key:'720P',label:{zh:'720P',en:'720P',ja:'720P'}},{ key:'1080P',label:{zh:'1080P',en:'1080P',ja:'1080P'}}], default: '720P' },
      { key: 'ratio', icon: '◇', options: RATIO_OPTIONS.filter(o => ['16:9','9:16','3:4','4:3','1:1'].includes(o.key)), default: '16:9' },
    ],
    toParams(s, refUrls) {
      return { duration: s.duration||'5', resolution: s.resolution||'720P', ratio: s.ratio||'16:9', images: refUrls.length ? refUrls : undefined }
    },
  },
  // Vidu Q3 Turbo
  'viduq3-turbo': {
    imageMin: 1, imageMax: 2, imageLabel: { zh: '首尾帧(1-2张)', en: 'Frames (1-2)', ja: '先頭/末尾(1-2枚)' },
    groups: [
      { key: 'duration', icon: '◷', options: DUR_OPTIONS_1_16, default: '4' },
      { key: 'resolution', icon: '◨', options: [{ key:'540p',label:{zh:'540p',en:'540p',ja:'540p'}},{ key:'720p',label:{zh:'720p',en:'720p',ja:'720p'}},{ key:'1080p',label:{zh:'1080p',en:'1080p',ja:'1080p'}}], default: '720p' },
      { key: 'off_peak', icon: '◈', options: [{ key:'false',label:{zh:'正常',en:'Normal',ja:'通常'}},{ key:'true',label:{zh:'错峰(半价)',en:'Off-peak',ja:'半額'}}], default: 'false' },
    ],
    toParams(s, refUrls) {
      return { duration: s.duration||'4', resolution: s.resolution||'720p', off_peak: s.off_peak === 'true', ...(refUrls.length ? { images: refUrls } : {}) }
    },
  },
}

const DEFAULT_PARAM_CONFIG = {
  imageMin: 0, imageMax: 1, imageLabel: { zh: '参考图', en: 'Reference', ja: '参照画像' },
  groups: [
    { key: 'duration', icon: '◷', options: [{ key:'4',label:{zh:'4秒',en:'4s',ja:'4秒'}},{ key:'8',label:{zh:'8秒',en:'8s',ja:'8秒'}}], default: '4' },
    { key: 'resolution', icon: '◨', options: [{ key:'720p',label:{zh:'720p',en:'720p',ja:'720p'}},{ key:'1080p',label:{zh:'1080p',en:'1080p',ja:'1080p'}}], default: '720p' },
  ],
  toParams(s, refUrls) {
    return { duration: s.duration||'4', resolution: s.resolution||'720p', ...(refUrls.length ? { images: refUrls } : {}) }
  },
}

// 当前选中模型对应的参数配置（响应式）
const activeParamConfig = computed(() => {
  const id = selectedStudioModel.value?.providerModelId
  return (id && MODEL_PARAM_CONFIGS[id]) || DEFAULT_PARAM_CONFIG
})

// 对话框选项组（根据选中模型动态变化）
const composerOptionGroups = computed(() => activeParamConfig.value.groups)

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
      resend: '重新发送',
      submitLogin: '登录并进入',
      logout: '退出',
      download: '下载',
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
      categories: {
        chat: '聊天',
        image: '图片',
        video: '视频',
        audio: '音频',
        mine: '我的',
      },
      taskList: '任务列表',
      inspiration: '灵感',
      selectedModel: '当前模型',
      promptHint: '描述视频内容、动作和场景，可上传首帧或尾帧图片控制视频生成。支持 4-12 秒有声视频。',
      firstFrame: '首帧',
      lastFrame: '尾帧',
      referenceImage: '上传参考图',
      removeReference: '移除参考图',
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
      passwordLogin: '密码登录',
      username: '用户名',
      usernamePlaceholder: '请输入用户名',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
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
      resend: 'Resend',
      submitLogin: 'Log In',
      logout: 'Log Out',
      download: 'Download',
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
      categories: {
        chat: 'Chat',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        mine: 'Mine',
      },
      taskList: 'Tasks',
      inspiration: 'Ideas',
      selectedModel: 'Selected model',
      promptHint: 'Describe the video content, actions and scene. Upload first or last frames to guide generation. Supports 4-12s videos with audio.',
      firstFrame: 'First',
      lastFrame: 'Last',
      referenceImage: 'Upload reference',
      removeReference: 'Remove reference',
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
      passwordLogin: 'Password Login',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
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
      resend: '再送信',
      submitLogin: 'ログイン',
      logout: 'ログアウト',
      download: 'ダウンロード',
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
      categories: {
        chat: 'チャット',
        image: '画像',
        video: '動画',
        audio: '音声',
        mine: '自分',
      },
      taskList: 'タスク',
      inspiration: 'ヒント',
      selectedModel: '選択中のモデル',
      promptHint: '動画内容、動き、シーンを入力。最初または最後のフレーム画像で生成を制御できます。4-12 秒の音付き動画に対応。',
      firstFrame: '先頭',
      lastFrame: '末尾',
      referenceImage: '参照画像を追加',
      removeReference: '参照画像を削除',
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
      passwordLogin: 'パスワードログイン',
      username: 'ユーザー名',
      usernamePlaceholder: 'ユーザー名を入力',
      passwordLabel: 'パスワード',
      passwordPlaceholder: 'パスワードを入力',
      agreement: '続行すると、利用規約とプライバシーポリシーに同意したものとみなされます。',
      success: 'コンソールを開きました',
    },
  },
}

const t = computed(() => translations[activeLocale.value])
const authTitle = computed(() => t.value.auth.titleLogin)
const submitLabel = computed(() => authLoading.value ? '...' : t.value.actions.submitLogin)

const filteredStudioModels = computed(() => studioModels.value)
const selectedStudioModel = computed(
  () => studioModels.value.find((model) => model.id === activeStudioModel.value) || studioModels.value[0],
)

const composerSelections = ref({})

function resetComposerSelections() {
  composerSelections.value = Object.fromEntries(
    composerOptionGroups.value.map((group) => [group.key, group.default]),
  )
}
// 初始化 & 模型切换时重置
const openComposerDropdown = ref(null)
resetComposerSelections()
watch(() => activeStudioModel.value, () => { resetComposerSelections(); openComposerDropdown.value = null })

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

onMounted(async () => {
  if (localStorage.getItem('hub_token')) {
    try {
      await getProfile() // 验证 token 是否还有效
      isAuthenticated.value = true
      activeView.value = 'console'
      loadUserData()
    } catch {
      // 验证失败（token 过期 / 后端挂了）→ 清除 token 显示登录
      localStorage.removeItem('hub_token')
      showAuthModal.value = true
    }
  } else {
    showAuthModal.value = true
  }
  document.addEventListener('click', handleDocumentClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  stopGenerationsPolling()
  clearReferenceImages()
})

const promptText = ref('')
const conversations = ref([])
const GENERATIONS_POLL_INTERVAL_MS = 5000
let generationsPollTimer = null
let generationsRequestSequence = 0
const referenceInput = ref(null)
const referenceImages = ref([])   // [{ file, previewUrl }]
const submitting = ref(false)
const isComposerDragActive = ref(false)

function clearReferenceImages() {
  referenceImages.value.forEach(r => { if (r.previewUrl) URL.revokeObjectURL(r.previewUrl) })
  referenceImages.value = []
}
function removeReferenceImage(index) {
  const removed = referenceImages.value.splice(index, 1)
  removed.forEach(r => { if (r.previewUrl) URL.revokeObjectURL(r.previewUrl) })
}

function addReferenceFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }
  const max = activeParamConfig.value.imageMax
  if (referenceImages.value.length >= max) {
    alert(`最多 ${max} 张图片`)
    return
  }
  const previewUrl = URL.createObjectURL(file)
  referenceImages.value = [...referenceImages.value, { file, previewUrl }]
}

function handleReferenceFile(event) {
  const files = Array.from(event.target.files || [])
  for (const file of files) {
    if (referenceImages.value.length >= activeParamConfig.value.imageMax) break
    addReferenceFile(file)
  }
  event.target.value = ''
}

function handlePromptPaste(event) {
  const items = Array.from(event.clipboardData?.items || [])
  const imageItems = items.filter((item) => item.type.startsWith('image/'))
  if (imageItems.length === 0) return

  let addedCount = 0
  for (const item of imageItems) {
    if (referenceImages.value.length >= activeParamConfig.value.imageMax) break
    const file = item.getAsFile()
    if (!file) continue
    addReferenceFile(file)
    addedCount += 1
  }

  if (addedCount > 0) {
    event.preventDefault()
  }
}

function handleComposerDragEnter(event) {
  const types = Array.from(event.dataTransfer?.types || [])
  if (types.includes('Files')) {
    isComposerDragActive.value = true
  }
}

function handleComposerDragOver(event) {
  const files = Array.from(event.dataTransfer?.files || [])
  const hasImage = files.some((file) => file.type.startsWith('image/'))
  if (!hasImage) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  isComposerDragActive.value = true
}

function handleComposerDragLeave(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  isComposerDragActive.value = false
}

function handleComposerDrop(event) {
  const files = Array.from(event.dataTransfer?.files || [])
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  isComposerDragActive.value = false
  if (imageFiles.length === 0) return

  event.preventDefault()
  for (const file of imageFiles) {
    if (referenceImages.value.length >= activeParamConfig.value.imageMax) break
    addReferenceFile(file)
  }
}

// 模型切换时清空
watch(() => activeStudioModel.value, () => { clearReferenceImages() })

async function downloadResult(conv) {
  const url = conv.result?.thumbnailUrl
  if (!url) return
  const extension = conv.result.type === 'video' ? 'mp4' : 'png'
  let filename = `generation-${conv.id}.${extension}`
  try {
    const pathname = new URL(url, window.location.href).pathname
    const sourceName = decodeURIComponent(pathname.split('/').pop() || '')
    if (sourceName.includes('.')) filename = sourceName
  } catch { /* use generated filename */ }
  const save = (href) => {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('download failed')
    const objectUrl = URL.createObjectURL(await response.blob())
    save(objectUrl)
    URL.revokeObjectURL(objectUrl)
  } catch {
    save(url)
  }
}


function currentParameterLabels() {
  return composerOptionGroups.value
    .map((group) => {
      const selected = composerSelections.value[group.key]
      const option = group.options.find((o) => o.key === selected)
      return option?.label[activeLocale.value]
    })
    .filter(Boolean)
}

async function submitGeneration() {
  const text = promptText.value.trim()
  if (!text) return
  const model = selectedStudioModel.value
  if (!model) return
  const cfg = activeParamConfig.value

  if (submitting.value) return
  submitting.value = true

  try {
    // 1. 上传所有文件，获取 URL
    const uploadPromises = referenceImages.value.map(r =>
      r.file ? uploadAsset(r.file).then(u => u.url) : null
    )
    const refUrls = (await Promise.all(uploadPromises)).filter(Boolean)

    // 2. 校验数量
    if (refUrls.length < cfg.imageMin) {
      alert(`当前模型需要至少 ${cfg.imageMin} 张图片，已上传 ${refUrls.length} 张`)
      return
    }

    // 3. 创建生成任务
    const params = cfg.toParams(composerSelections.value, refUrls)
    await createGeneration({
      model_id: Number(model.id),
      prompt: text,
      params: JSON.stringify(params),
    })
    promptText.value = ''
    clearReferenceImages()
    openComposerDropdown.value = null
    await fetchConversations()
  } catch (e) {
    alert(e.message)
  } finally {
    submitting.value = false
  }
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
    loadUserData()
    return
  }
  showAuthModal.value = true
}

// ── 密码登录 ──
async function doPasswordLogin() {
  if (!authForm.value.username || !authForm.value.password) {
    authError.value = '请输入用户名和密码'
    return
  }
  authLoading.value = true
  authError.value = ''
  try {
    const data = await loginApi({
      username: authForm.value.username,
      password: authForm.value.password,
    })
    saveToken(data.token)
    isAuthenticated.value = true
    activeView.value = 'console'
    showAuthModal.value = false
    resetAuthForm()
    loadUserData()
  } catch (e) {
    authError.value = e.message || '登录失败'
  } finally {
    authLoading.value = false
  }
}

function resetAuthForm() {
  authForm.value = { phone: '', code: '', username: '', password: '' }
  authError.value = ''
}

function submitAuth() {
  doPasswordLogin()
}

async function openAssetsPage() {
  stopGenerationsPolling()
  activeView.value = 'works'
  try { profile.value = await getProfile() } catch {}
}

function backToStudio() {
  activeView.value = 'console'
  fetchConversations()
}

function logout() {
  stopGenerationsPolling()
  isAuthenticated.value = false
  activeView.value = 'home'
  showAuthModal.value = true
  clearReferenceImages()
  resetAuthForm()
  localStorage.removeItem('hub_token')
}

// ── 数据加载 ──
function mapGeneration(g) {
  return {
    id: String(g.id),
    promptText: g.prompt,
    modelId: String(g.model_id),
    modelName: '',
    accentColor: '#5a7bff',
    assets: { firstFrame: null, lastFrame: null },
    parameterLabels: [],
    status: g.status === 'done' ? 'completed' : g.status === 'failed' ? 'failed' : 'running',
    errorMessage: g.error || '',
    estimatedCredits: g.status === 'running' ? { min: '-', max: '-' } : undefined,
    result: g.result_url
      ? {
          type: g.result_url.includes('.mp4') ? 'video' : 'image',
          thumbnailUrl: g.result_url,
          durationSeconds: g.result_url.includes('.mp4') ? 4 : null,
        }
      : undefined,
    creditsConsumed: g.cost,
    createdAt: g.created_at,
  }
}

function stopGenerationsPolling() {
  if (generationsPollTimer !== null) {
    window.clearTimeout(generationsPollTimer)
    generationsPollTimer = null
  }
}

function scheduleGenerationsPolling() {
  stopGenerationsPolling()
  if (!isAuthenticated.value || activeView.value !== 'console') return
  generationsPollTimer = window.setTimeout(() => {
    generationsPollTimer = null
    fetchConversations()
  }, GENERATIONS_POLL_INTERVAL_MS)
}

async function loadUserData() {
  try {
    const [models, prof] = await Promise.all([getModels(), getProfile()])
    studioModels.value = (models || []).map(m => ({
      id: String(m.id),
      name: m.name,
      vendor: m.vendor,
      providerModelId: m.provider_model_id,
      score: m.cost ? `${m.cost} cr` : 'N/A',
      category: m.category,
      accent: m.category === 'video' ? '#5a7bff' : m.category === 'image' ? '#e85d75' : '#7c5cfc',
      desc: {
        zh: m.description || `${m.vendor} · ${m.category}`,
        en: m.description || `${m.vendor} · ${m.category}`,
        ja: m.description || `${m.vendor} · ${m.category}`,
      },
    }))
    profile.value = prof || {}
    await fetchConversations()
  } catch { /* ignore */ }
}

async function fetchConversations() {
  const requestSequence = ++generationsRequestSequence
  let shouldPoll = conversations.value.some(conv => conv.status === 'running')

  try {
    const gens = await getGenerations()
    if (requestSequence !== generationsRequestSequence) return

    const generationList = Array.isArray(gens) ? gens : []
    conversations.value = generationList.map(mapGeneration)
    shouldPoll = generationList.some(generation => generation.status === 'running')
  } catch {
    if (requestSequence !== generationsRequestSequence) return
  }

  if (shouldPoll) scheduleGenerationsPolling()
  else stopGenerationsPolling()
}
</script>

<template>
  <div
    v-if="isAuthenticated && activeView === 'works'"
    class="desktop-scale-frame desktop-scale-frame-assets"
  >
    <div class="desktop-scale-canvas">
      <main class="assets-shell">
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
    </div>
  </div>

  <div
    v-else-if="isAuthenticated && activeView === 'console'"
    class="desktop-scale-frame desktop-scale-frame-studio"
  >
    <div class="desktop-scale-canvas">
      <main
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

      <div class="studio-user-card">
        <span class="user-avatar">远</span>
        <div>
          <strong>远去画眉</strong>
          <p><i></i>{{ t.studio.online }}</p>
        </div>
      </div>
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
          <button class="studio-logout-button" type="button" @click="logout">
            {{ t.actions.logout }}
          </button>
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
                <span>生成中…</span>
              </div>
              <div v-else-if="conv.status === 'failed'" class="conv-failed">
                生成失败：{{ conv.errorMessage || '请稍后重试' }}
              </div>
              <div
                v-else-if="conv.status === 'completed' && conv.result"
                class="conv-result"
              >
                <div class="conv-thumb" :class="`type-${conv.result.type}`">
                  <video v-if="conv.result.type === 'video'" :src="conv.result.thumbnailUrl" controls style="width:100%;max-height:300px;border-radius:8px"></video>
                  <img v-else :src="conv.result.thumbnailUrl" :alt="`${conv.modelName} result`" />
                  <span
                    v-if="conv.result.durationSeconds"
                    class="conv-thumb-duration"
                  >{{ conv.result.durationSeconds }}s</span>
                </div>
                <footer class="conv-result-footer">
                  <button type="button" @click="downloadResult(conv)">{{ t.actions.download }}</button>
                </footer>
              </div>
            </div>
          </div>
        </article>
      </div>

      <form class="studio-composer" @submit.prevent="submitGeneration">
        <div class="composer-reference">
          <input
            ref="referenceInput"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            @change="handleReferenceFile"
          />
          <button
            type="button"
            class="composer-reference-panel"
            :class="{ empty: referenceImages.length === 0 }"
            @click="referenceInput?.click()"
          >
            <div v-if="referenceImages.length" class="composer-reference-list">
              <div v-for="(img, idx) in referenceImages" :key="img.previewUrl" class="composer-reference-preview">
                <img :src="img.previewUrl" :alt="`参考图 ${idx+1}`" />
                <button type="button" :aria-label="t.studio.removeReference" @click.stop="removeReferenceImage(idx)">×</button>
              </div>
            </div>
            <div v-else class="composer-reference-empty">上传图片 / 粘贴图片</div>
          </button>
          <span class="composer-reference-hint">
            点击上传图片，或粘贴图片到对话框
            <template v-if="activeParamConfig.imageMin > 0 && referenceImages.length < activeParamConfig.imageMin">
              ，还需 {{ activeParamConfig.imageMin - referenceImages.length }} 张
            </template>
            <template v-else-if="referenceImages.length >= activeParamConfig.imageMax">
              ，已达上限（最多 {{ activeParamConfig.imageMax }} 张）
            </template>
          </span>
        </div>
        <textarea
          v-model="promptText"
          :class="{ 'drag-active': isComposerDragActive }"
          :placeholder="t.studio.promptHint"
          @dragenter="handleComposerDragEnter"
          @dragover="handleComposerDragOver"
          @dragleave="handleComposerDragLeave"
          @drop="handleComposerDrop"
          @paste="handlePromptPaste"
        ></textarea>
        <div class="composer-meta">
          <div class="composer-options">
            <div
              v-for="group in composerOptionGroups"
              :key="group.key"
              class="composer-option-wrap"
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
          <button class="composer-submit" type="submit" :disabled="submitting">{{ submitting ? '⏳' : '↑' }}</button>
        </div>
      </form>
        </section>
      </main>
    </div>
  </div>

    <!-- Auth modal (shown when not authenticated) -->
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

        <!-- Error message -->
        <div v-if="authError" class="auth-error">{{ authError }}</div>

        <!-- Password login form -->
        <form class="auth-form" @submit.prevent="submitAuth">
          <label>
            <span>{{ t.auth.username }}</span>
            <input v-model="authForm.username" type="text" :placeholder="t.auth.usernamePlaceholder" required />
          </label>

          <label>
            <span>{{ t.auth.passwordLabel }}</span>
            <input v-model="authForm.password" type="password" :placeholder="t.auth.passwordPlaceholder" required />
          </label>

          <button class="button button-primary auth-submit" type="submit" :disabled="authLoading">{{ submitLabel }}</button>
          <p class="auth-agreement">{{ t.auth.agreement }}</p>
        </form>
      </section>
    </div>
  </template>
