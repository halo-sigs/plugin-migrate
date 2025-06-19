import { rsbuildConfig } from '@halo-dev/ui-plugin-bundler-kit'
import Icons from 'unplugin-icons/rspack'
import { UnoCSSRspackPlugin } from '@unocss/webpack/rspack'

export default rsbuildConfig({
  rsbuild: {
    resolve: {
      alias: {
        '@': './src'
      }
    },
    tools: {
      rspack: {
        plugins: [Icons({ compiler: 'vue3' }), UnoCSSRspackPlugin()],
        module: {
          parser: {
            javascript: {
              importMeta: true
            }
          }
        }
      }
    }
  }
})
