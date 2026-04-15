import { rsbuildConfig } from '@halo-dev/ui-plugin-bundler-kit'
import { UnoCSSRspackPlugin } from '@unocss/webpack/rspack'
import Icons from 'unplugin-icons/rspack'

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
