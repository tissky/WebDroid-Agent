const APP_PACKAGE_BY_ALIAS: Record<string, string> = {
  // English and romanized aliases.
  alipay: 'com.eg.android.AlipayGphone',
  amazon: 'com.amazon.mShop.android.shopping',
  bilibili: 'tv.danmaku.bili',
  calendar: 'com.google.android.calendar',
  calculator: 'com.google.android.calculator',
  camera: 'com.android.camera',
  chrome: 'com.android.chrome',
  clock: 'com.google.android.deskclock',
  contacts: 'com.google.android.contacts',
  douyin: 'com.ss.android.ugc.aweme',
  ebay: 'com.ebay.mobile',
  files: 'com.google.android.documentsui',
  gmail: 'com.google.android.gm',
  googlemaps: 'com.google.android.apps.maps',
  instagram: 'com.instagram.android',
  jd: 'com.jingdong.app.mall',
  jdcom: 'com.jingdong.app.mall',
  maps: 'com.google.android.apps.maps',
  messages: 'com.google.android.apps.messaging',
  phone: 'com.google.android.dialer',
  photos: 'com.google.android.apps.photos',
  playstore: 'com.android.vending',
  pinduoduo: 'com.xunmeng.pinduoduo',
  qq: 'com.tencent.mobileqq',
  reddit: 'com.reddit.frontpage',
  settings: 'com.android.settings',
  taobao: 'com.taobao.taobao',
  telegram: 'org.telegram.messenger',
  tiktok: 'com.zhiliaoapp.musically',
  twitter: 'com.twitter.android',
  wechat: 'com.tencent.mm',
  whatsapp: 'com.whatsapp',
  x: 'com.twitter.android',
  xiaohongshu: 'com.xingin.xhs',
  youtube: 'com.google.android.youtube',
  zhihu: 'com.zhihu.android',
  gallery: 'com.coloros.gallery3d',
  mms: 'com.android.mms',
  sms: 'com.android.mms',

  // Chinese aliases.
  设置: 'com.android.settings',
  浏览器: 'com.android.chrome',
  google浏览器: 'com.android.chrome',
  邮箱: 'com.google.android.gm',
  邮件: 'com.google.android.gm',
  相机: 'com.android.camera',
  电话: 'com.google.android.dialer',
  短信: 'com.google.android.apps.messaging',
  联系人: 'com.android.contacts',
  通讯录: 'com.android.contacts',
  相册: 'com.coloros.gallery3d',
  地图: 'com.google.android.apps.maps',
  应用商店: 'com.android.vending',
  京东: 'com.jingdong.app.mall',
  微信: 'com.tencent.mm',
  淘宝: 'com.taobao.taobao',
  支付宝: 'com.eg.android.AlipayGphone',
  抖音: 'com.ss.android.ugc.aweme',
  小红书: 'com.xingin.xhs',
  拼多多: 'com.xunmeng.pinduoduo',
  知乎: 'com.zhihu.android',
  微博: 'com.sina.weibo',
  美团: 'com.sankuai.meituan',
  饿了么: 'me.ele',
  高德地图: 'com.autonavi.minimap',
  百度地图: 'com.baidu.BaiduMap',
  网易云音乐: 'com.netease.cloudmusic',
}

const APP_DISPLAY_NAME_BY_PACKAGE: Record<string, string> = {
  'com.android.camera': 'camera',
  'com.android.contacts': '联系人',
  'com.android.mms': '短信',
  'com.android.settings': 'settings',
  'com.android.vending': 'playstore',
  'com.amazon.mShop.android.shopping': 'amazon',
  'com.android.chrome': 'chrome',
  'com.autonavi.minimap': '高德地图',
  'com.baidu.BaiduMap': '百度地图',
  'com.coloros.gallery3d': '相册',
  'com.ebay.mobile': 'ebay',
  'com.eg.android.AlipayGphone': '支付宝',
  'com.google.android.apps.maps': 'maps',
  'com.google.android.apps.messaging': 'messages',
  'com.google.android.apps.photos': 'photos',
  'com.google.android.calendar': 'calendar',
  'com.google.android.calculator': 'calculator',
  'com.google.android.contacts': 'contacts',
  'com.google.android.deskclock': 'clock',
  'com.google.android.dialer': 'phone',
  'com.google.android.documentsui': 'files',
  'com.google.android.gm': 'gmail',
  'com.google.android.youtube': 'youtube',
  'com.instagram.android': 'instagram',
  'com.jingdong.app.mall': '京东',
  'com.netease.cloudmusic': '网易云音乐',
  'com.reddit.frontpage': 'reddit',
  'com.sankuai.meituan': '美团',
  'com.sina.weibo': '微博',
  'com.ss.android.ugc.aweme': '抖音',
  'com.taobao.taobao': '淘宝',
  'com.tencent.mm': '微信',
  'com.tencent.mobileqq': 'qq',
  'com.twitter.android': 'x',
  'com.whatsapp': 'whatsapp',
  'com.xingin.xhs': '小红书',
  'com.xunmeng.pinduoduo': '拼多多',
  'com.zhihu.android': '知乎',
  'com.zhiliaoapp.musically': 'tiktok',
  'me.ele': '饿了么',
  'org.telegram.messenger': 'telegram',
  'tv.danmaku.bili': 'bilibili',
}

const ANDROID_PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/

export function resolveAppPackage(app: string): string | undefined {
  const direct = app.trim()
  const aliasPackage = APP_PACKAGE_BY_ALIAS[normalizeAppName(direct)]
  if (aliasPackage) {
    return aliasPackage
  }

  if (ANDROID_PACKAGE_NAME_PATTERN.test(direct)) {
    return direct
  }
  return undefined
}

export function resolveAppNameFromPackage(packageName: string) {
  return APP_DISPLAY_NAME_BY_PACKAGE[packageName]
}

export function resolveAppAliasesFromPackage(packageName: string) {
  const aliases = new Set<string>()
  const displayName = resolveAppNameFromPackage(packageName)
  if (displayName) {
    aliases.add(displayName)
  }

  for (const [alias, candidatePackage] of Object.entries(APP_PACKAGE_BY_ALIAS)) {
    if (candidatePackage === packageName) {
      aliases.add(alias)
    }
  }

  return [...aliases]
}

function normalizeAppName(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, '')
}
