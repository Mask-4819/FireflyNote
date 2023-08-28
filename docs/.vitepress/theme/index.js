import DefaultTheme from "vitepress/theme";
import layout from "./layout.vue"
export default {
  ...DefaultTheme,
  enhanceApp(ctx) {
    // extend default theme custom behaviour.
    DefaultTheme.enhanceApp(ctx);

    // register your custom global components
    ctx.app.component(layout);
  },
};
