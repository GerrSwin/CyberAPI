import { AddOutline, SaveOutline, TrashOutline } from '@vicons/ionicons5'
import { DataTableColumns, NButton, NCheckbox, NDataTable, NIcon, NInput, NPopconfirm, NSpace, NSwitch, NText, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'

import { newDefaultProxySetting, ProxyMode, ProxySetting, ProxyStatus } from '../commands/proxy'
import { showError } from '../helpers/util'
import { i18nCommon, i18nSetting } from '../i18n'
import { useProxyStore } from '../stores/proxy'

export default defineComponent({
  name: 'ProxySetting',
  setup() {
    const message = useMessage()
    const proxyStore = useProxyStore()
    const { proxies, fetching, saving, removing } = storeToRefs(proxyStore)

    const rows = ref<ProxySetting[]>([])
    const updateRows = () => {
      rows.value = proxies.value.map((item) =>
        Object.assign({}, item, {
          enabled: item.enabled ?? ProxyStatus.Enabled,
        }),
      )
    }
    watch(
      proxies,
      () => {
        updateRows()
      },
      { immediate: true },
    )

    const busy = computed(() => saving.value || removing.value)

    const updateRowField = (id: string, key: keyof ProxySetting, value: string | ProxyMode | ProxyStatus) => {
      rows.value = rows.value.map((item) => {
        if (item.id !== id) {
          return item
        }
        return Object.assign({}, item, { [key]: value })
      })
    }

    const handleAdd = () => {
      const next = newDefaultProxySetting()
      rows.value = rows.value.concat([next])
    }

    const handleSave = async (row: ProxySetting) => {
      const proxy = (row.proxy || '').trim()
      if (!proxy) {
        message.error(i18nSetting('proxyRequired'))
        return
      }
      const payload = Object.assign({}, row, { proxy })
      try {
        const exists = proxyStore.getByID(row.id)
        if (exists) {
          await proxyStore.update(payload)
        } else {
          await proxyStore.add(payload)
        }
        message.success(i18nSetting('proxySaveSuccess'))
      } catch (err) {
        showError(message, err)
      }
    }

    const handleDelete = async (row: ProxySetting) => {
      try {
        const exists = proxyStore.getByID(row.id)
        if (exists) {
          await proxyStore.remove(row.id)
        }
        rows.value = rows.value.filter((item) => item.id !== row.id)
        message.success(i18nSetting('proxyDeleteSuccess'))
      } catch (err) {
        showError(message, err)
      }
    }

    onMounted(async () => {
      try {
        await proxyStore.fetch()
      } catch (err) {
        showError(message, err)
      }
    })

    return {
      busy,
      fetching,
      rows,
      handleAdd,
      handleSave,
      handleDelete,
      updateRowField,
      ProxyMode,
    }
  },
  render() {
    const { rows, busy, fetching, ProxyMode } = this
    const columns: DataTableColumns<ProxySetting> = [
      {
        title: i18nSetting('proxyField'),
        key: 'proxy',
        width: 220,
        render: (row) => {
          return (
            <NInput
              value={row.proxy}
              placeholder={i18nSetting('proxyFieldPlaceholder')}
              onUpdateValue={(value) => {
                this.updateRowField(row.id, 'proxy', value)
              }}
            />
          )
        },
      },
      {
        title: i18nSetting('proxyListField'),
        key: 'list',
        render: (row) => {
          return (
            <NInput
              type="textarea"
              rows={3}
              value={row.list}
              placeholder={i18nSetting('proxyListPlaceholder')}
              onUpdateValue={(value) => {
                this.updateRowField(row.id, 'list', value)
              }}
            />
          )
        },
      },
      {
        title: i18nSetting('proxyEnabled'),
        key: 'enabled',
        width: 120,
        render: (row) => {
          const checked = row.enabled !== ProxyStatus.Disabled
          return (
            <NSwitch
              value={checked}
              size="small"
              onUpdateValue={(value) => {
                this.updateRowField(row.id, 'enabled', value ? ProxyStatus.Enabled : ProxyStatus.Disabled)
              }}
            />
          )
        },
      },
      {
        title: i18nSetting('proxyListMode'),
        key: 'mode',
        width: 180,
        render: (row) => {
          const checked = row.mode === ProxyMode.Exclude
          const label = checked ? i18nSetting('proxyModeExclude') : i18nSetting('proxyModeInclude')
          return (
            <NCheckbox
              checked={checked}
              onUpdateChecked={(value) => {
                this.updateRowField(row.id, 'mode', value ? ProxyMode.Exclude : ProxyMode.Include)
              }}
            >
              {label}
            </NCheckbox>
          )
        },
      },
      {
        title: i18nCommon('op'),
        key: 'op',
        width: 220,
        render: (row) => {
          const slots = {
            trigger: () => (
              <NButton quaternary size="small" disabled={busy}>
                <NIcon>
                  <TrashOutline />
                </NIcon>
                <NText>{i18nCommon('delete')}</NText>
              </NButton>
            ),
          }
          return (
            <NSpace>
              <NButton size="small" type="primary" ghost disabled={busy} onClick={() => this.handleSave(row)}>
                <NIcon>
                  <SaveOutline />
                </NIcon>
                <NText>{i18nSetting('saveProxy')}</NText>
              </NButton>
              <NPopconfirm
                v-slots={slots}
                onPositiveClick={() => {
                  this.handleDelete(row)
                }}
              >
                {i18nSetting('proxyDeleteConfirm')}
              </NPopconfirm>
            </NSpace>
          )
        },
      },
    ]
    return (
      <div>
        <NSpace justify="space-between" align="center" style={{ marginBottom: '12px' }}>
          <div>
            <NText depth="3">{i18nSetting('proxyListHelp')}</NText>
          </div>
          <NButton type="primary" strong onClick={this.handleAdd} disabled={busy}>
            <NIcon>
              <AddOutline />
            </NIcon>
            {i18nSetting('addProxy')}
          </NButton>
        </NSpace>
        <NDataTable
          columns={columns}
          data={rows}
          loading={fetching}
          rowKey={(row) => row.id}
        />
      </div>
    )
  },
})
