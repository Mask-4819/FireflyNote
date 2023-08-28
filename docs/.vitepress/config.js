export default {
  title: "FireflyNote",
  themeConfig: {
    siteTitle: "FireflyNote",
    nav: [
      { text: "Vue3", link: "/Vue/", activeMatch: "/Vue/" },
      { text: "有趣的JavaScript", link: "/JavaScript/" },
      { text: "工程化", link: "/configs" },
      { text: "HTML+CSS", link: "/configs" },
      { text: "工具使用", link: "/configs" },
      { text: "后端", link: "/configs" },
    ],
    sidebar: {
      "/Vue/": [
        {
          text: "reactivity响应式",
          collapsible: false,
          collapsed: false,
          items: [
            // This shows `/guide/index.md` page.
            { text: "响应式原理", link: "/Vue/" },
            { text: "effect缺陷修复", link: "/Vue/effect1" },
            { text: "effect功能完善", link: "/Vue/effect2" },
            { text: "实现computed", link: "/Vue/computed" },
            { text: "实现watch", link: "/Vue/watch" },
          ],
        },
      ],
      "/JavaScript/": [
        {
          text: "JavaScript基础",
          collapsible: true,
          collapsed: false,
          items: [{ text: "数据类型", link: "/JavaScript/base/" }],
        },
        {
          text: "手撕系列",
          collapsible: true,
          collapsed: false,
          items: [{ text: "Index1", link: "/JavaScript/theory/" }],
        },
        {
          text: "JavaScript小工具",
          collapsible: true,
          collapsed: false,
          items: [{ text: "Index1", link: "/JavaScript/tool/" }],
        },
      ],
    },
  },
};
