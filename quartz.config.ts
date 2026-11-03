import { QuartzConfig } from "./quartz/cfg"
import { ComponentResources } from "./quartz/components"
import { plugins } from "./quartz/plugins"

const config: QuartzConfig = {
  baseUrl: "/my-notes",
  pageTitle: "我的个人笔记",
  enableSPA: true,
  enablePopovers: true,
  analytics: null,
  locale: "zh-CN",
  plugins: plugins,
  components: ComponentResources,
}

export default config
