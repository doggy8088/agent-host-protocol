import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// Canonical origin of the published GitHub Pages site (custom domain, served at root).
const SITE_URL = 'https://agent-host-protocol.gh.miniasp.com'
const SITE_TITLE = '代理主機協定'
const SITE_DESCRIPTION = '代理主機協定文件 — 為 AI 代理程式工作階段提供同步的多用戶端狀態協定'
const OG_IMAGE = `${SITE_URL}/og.png`

export default withMermaid(defineConfig({
  lang: 'zh-TW',
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  base: '/',

  head: [
    ['link', { rel: 'stylesheet', href: 'https://unpkg.com/@vscode/codicons/dist/codicon.css' }],

    // Icons
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'mask-icon', href: '/favicon.svg', color: '#57a6ff' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],

    // SEO
    ['meta', { name: 'robots', content: 'index, follow, max-image-preview: large' }],
    ['meta', { name: 'author', content: 'Microsoft' }],
    ['meta', { name: 'generator', content: 'VitePress' }],

    // Open Graph (static defaults; per-page title/description/url set in transformHead)
    ['meta', { property: 'og:site_name', content: SITE_TITLE }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh_TW' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: SITE_TITLE }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
    ['meta', { name: 'twitter:image:alt', content: SITE_TITLE }],
  ],

  // Per-page SEO: canonical URL + OpenGraph/Twitter title/description/url.
  transformHead({ pageData }) {
    const rel: string = pageData.relativePath
    const path = rel === 'index.md' ? '' : rel.replace(/\.md$/, '')
    const url = `${SITE_URL}${path ? '/' + path : '/'}`
    const title: string = pageData.title || SITE_TITLE
    const description: string = pageData.description || SITE_DESCRIPTION
    const fullTitle = title === SITE_TITLE ? title : `${title} | ${SITE_TITLE}`

    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:title', content: fullTitle }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { name: 'twitter:title', content: fullTitle }],
      ['meta', { name: 'twitter:description', content: description }],
    ]
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/what-is-ahp', activeMatch: '^/guide/' },
      { text: '規格', link: '/specification/overview', activeMatch: '^/specification/' },
      { text: '參考', link: '/reference/common', activeMatch: '^/reference/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '簡介',
          items: [
            { text: '什麼是 AHP？', link: '/guide/what-is-ahp' },
            { text: '入門', link: '/guide/getting-started' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: '狀態模型', link: '/guide/state-model' },
            { text: '操作', link: '/guide/actions' },
            { text: '引出', link: '/guide/elicitation' },
            { text: '終端機', link: '/guide/terminals' },
            { text: '自訂', link: '/guide/customizations' },
            { text: 'MCP 伺服器', link: '/guide/mcp' },
            { text: '預寫入協調', link: '/guide/reconciliation' },
          ],
        },
        {
          text: '更多',
          items: [
            { text: '原則', link: '/guide/doctrine' },
            { text: 'AHP 與 ACP', link: '/guide/ahp-and-acp' },
            { text: '用戶端', link: '/guide/clients' },
            { text: '實作', link: '/guide/implementations' },
          ],
        },
      ],
      '/specification/': [
        {
          text: '規格',
          items: [
            { text: '概述', link: '/specification/overview' },
            { text: '傳輸', link: '/specification/transport' },
            { text: '生命週期', link: '/specification/lifecycle' },
            { text: '通道與訂閱', link: '/specification/subscriptions' },
            { text: '驗證', link: '/specification/authentication' },
            { text: 'MCP 通道', link: '/specification/mcp-channel' },
            { text: '版本控制', link: '/specification/versioning' },
          ],
        },
        {
          text: '通道',
          items: [
            { text: '根通道', link: '/specification/root-channel' },
            { text: '工作階段通道', link: '/specification/session-channel' },
            { text: '聊天通道', link: '/specification/chat-channel' },
            { text: '終端機通道', link: '/specification/terminal-channel' },
            { text: '資源監視通道', link: '/specification/resource-watch-channel' },
            { text: '遙測通道', link: '/specification/telemetry-channel' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '參考',
          items: [
            { text: '通用', link: '/reference/common' },
            { text: '訊息', link: '/reference/messages' },
            { text: '錯誤碼', link: '/reference/error-codes' },
          ],
        },
        {
          text: '通道',
          items: [
            { text: '根通道', link: '/reference/root' },
            { text: '工作階段通道', link: '/reference/session' },
            { text: '聊天通道', link: '/reference/chat' },
            { text: '終端機通道', link: '/reference/terminal' },
            { text: '變更集通道', link: '/reference/changeset' },
            { text: '註解通道', link: '/reference/annotations' },
            { text: '遙測通道', link: '/reference/otlp' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/microsoft/agent-host-protocol' },
    ],

    footer: {
      message: '以 MIT 授權發布。',
      copyright: 'Copyright © 2026 Microsoft',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜尋文件',
            buttonAriaLabel: '搜尋文件',
          },
          modal: {
            noResultsText: '找不到結果',
            resetButtonTitle: '清除搜尋條件',
            footer: {
              selectText: '選取',
              navigateText: '切換',
              closeText: '關閉',
            },
          },
        },
      },
    },

    outlineTitle: '本頁內容',
    docFooter: {
      prev: '上一頁',
      next: '下一頁',
    },
    lastUpdatedText: '上次更新',
    returnToTopLabel: '回到頂端',
    sidebarMenuLabel: '選單',
    darkModeSwitchLabel: '主題',
    lightModeSwitchTitle: '切換到淺色模式',
    darkModeSwitchTitle: '切換到深色模式',

    editLink: {
      pattern: 'https://github.com/microsoft/agent-host-protocol/edit/main/docs/:path',
      text: '在 GitHub 上編輯此頁',
    },
  },
}))
