import { definePlugin } from '@halo-dev/console-shared'
import { defineAsyncComponent, markRaw } from 'vue'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'
import MigrateView from './views/MigrateView.vue'
import 'uno.css'
import { VLoading } from '@halo-dev/components'

export default definePlugin({
  routes: [
    {
      parentName: 'Root',
      route: {
        path: '/migrate',
        children: [
          {
            path: '',
            name: 'Migrate',
            component: defineAsyncComponent({
              loader: () => import('./views/MigrateView.vue'),
              loadingComponent: VLoading
            }),
            meta: {
              title: '迁移',
              searchable: true,
              permissions: ['*'],
              menu: {
                name: '迁移',
                group: 'tool',
                icon: markRaw(SolarTransferHorizontalBoldDuotone),
                priority: 0
              }
            }
          }
        ]
      }
    }
  ],
  extensionPoints: {}
})
