import { definePlugin } from '@halo-dev/ui-shared'
import 'uno.css'
import { markRaw } from 'vue'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'

export default definePlugin({
  routes: [
    {
      parentName: 'Root',
      route: {
        path: '/migrate',
        children: [
          {
            path: '',
            redirect: { name: 'MigrateSelect' }
          },
          {
            path: 'select',
            name: 'MigrateSelect',
            component: () => import('./views/SelectProviderView.vue'),
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
          },
          {
            path: 'execute',
            name: 'MigrateExecute',
            component: () => import('./views/MigrateView.vue'),
            meta: {
              title: '迁移执行',
              searchable: true,
              permissions: ['*']
            }
          }
        ]
      }
    }
  ]
})
