import { NButton, NCard, NDivider, NTabPane, NTabs, useDialog, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { defineComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import s from './EnvironmentManager.module.css'

import { Environment, EnvironmentStatus, newDefaultEnvironment } from '../commands/environment'
import { KVParam } from '../commands/interface'
import { newDefaultVariable, Variable, VariableCategory, VariableStatus } from '../commands/variable'
import newDialog from '../components/ExDialog'
import ExKeyValue, { HandleOption, HandleOptionCategory } from '../components/ExKeyValue'
import { showError } from '../helpers/util'
import { i18nCommon, i18nCustomizeVariable, i18nEnvManager } from '../i18n'
import { useEnvironmentStore, useEnvironmentVariableStore } from '../stores/environment'
import { useCustomizeStore } from '../stores/variable'

const globalTabKey = 'global'

function convertKVParams(variables: Variable[]): KVParam[] {
  return variables.map((item) => {
    return {
      key: item.name,
      value: item.value,
      enabled: item.enabled == VariableStatus.Enabled,
    }
  })
}

export default defineComponent({
  name: 'EnvironmentManager',
  setup() {
    const message = useMessage()
    const dialog = useDialog()
    const route = useRoute()
    const collection = ref('')

    const environmentStore = useEnvironmentStore()
    const environmentVariableStore = useEnvironmentVariableStore()
    const customizeStore = useCustomizeStore()

    const { environments } = storeToRefs(environmentStore)
    const { variables: environmentVariables } = storeToRefs(environmentVariableStore)
    const { variables: globalVariables } = storeToRefs(customizeStore)

    const activeTab = ref(globalTabKey)

    watch(
      () => route.query.collection,
      async (value) => {
        const nextCollection = Array.isArray(value) ? value[0] : value
        if (!nextCollection) {
          return
        }
        collection.value = nextCollection
        try {
          await environmentStore.fetch(nextCollection)
          await environmentVariableStore.fetch(nextCollection)
          await customizeStore.fetch(nextCollection)
        } catch (err) {
          showError(message, err)
        }
      },
      { immediate: true },
    )

    const openEnvironmentDialog = (env?: Environment) => {
      const isEdit = !!env
      newDialog({
        dialog,
        title: isEdit ? i18nEnvManager('editEnv') : i18nEnvManager('createEnv'),
        formItems: [
          {
            key: 'name',
            label: i18nEnvManager('envName'),
            placeholer: i18nEnvManager('envNamePlaceholder'),
            defaultValue: env?.name,
            rule: {
              required: true,
              message: i18nCommon('nameRequireError'),
              trigger: ['input', 'blur'],
            },
          },
        ],
        onConfirm: async (data) => {
          const name = (data.name as string) || ''
          if (isEdit && env) {
            const updated = Object.assign({}, env, {
              name,
            })
            await environmentStore.update(updated)
            return
          }
          const item = newDefaultEnvironment()
          item.collection = collection.value
          item.name = name
          item.enabled = EnvironmentStatus.Disabled
          await environmentStore.add(item)
          activeTab.value = item.id
        },
      })
    }

    const handleDeleteEnvironment = (env: Environment) => {
      dialog.warning({
        title: i18nEnvManager('deleteEnv'),
        content: i18nEnvManager('deleteEnvTips').replace('%s', env.name || ''),
        positiveText: i18nCommon('confirm'),
        onPositiveClick: async () => {
          const envVariables = environmentVariables.value.filter((item) => item.environment === env.id)
          await Promise.all(envVariables.map((item) => environmentVariableStore.remove(item.id)))
          await environmentStore.remove([env.id])
          if (activeTab.value === env.id) {
            activeTab.value = globalTabKey
          }
        },
      })
    }

    const handleGlobalVariable = async (opt: HandleOption) => {
      switch (opt.category) {
        case HandleOptionCategory.Add:
          {
            const item = opt.param
            let enabled = VariableStatus.Enabled
            if (item && !item.enabled) {
              enabled = VariableStatus.Disabled
            }
            const value = newDefaultVariable()
            value.collection = collection.value
            value.category = VariableCategory.Customize
            value.name = item?.key || ''
            value.value = item?.value || ''
            value.enabled = enabled
            await customizeStore.add(value)
          }
          break
        case HandleOptionCategory.Delete:
          {
            if (opt.index < customizeStore.variables.length) {
              const item = customizeStore.variables[opt.index]
              await customizeStore.remove(item.id)
            }
          }
          break
        default:
          {
            if (opt.index < customizeStore.variables.length) {
              const updateItem = customizeStore.variables[opt.index]
              const item = opt.param
              let enabled = VariableStatus.Enabled
              if (item && !item.enabled) {
                enabled = VariableStatus.Disabled
              }
              updateItem.name = item?.key || ''
              updateItem.value = item?.value || ''
              updateItem.enabled = enabled
              await customizeStore.update(updateItem)
            }
          }
          break
      }
    }

    const getEnvironmentVariables = (envId: string) => {
      return environmentVariables.value.filter((item) => item.environment === envId)
    }

    const handleEnvironmentVariable = async (envId: string, opt: HandleOption) => {
      const list = getEnvironmentVariables(envId)
      switch (opt.category) {
        case HandleOptionCategory.Add:
          {
            const item = opt.param
            let enabled = VariableStatus.Enabled
            if (item && !item.enabled) {
              enabled = VariableStatus.Disabled
            }
            const value = newDefaultVariable()
            value.collection = collection.value
            value.category = VariableCategory.Environment
            value.environment = envId
            value.name = item?.key || ''
            value.value = item?.value || ''
            value.enabled = enabled
            await environmentVariableStore.add(value)
          }
          break
        case HandleOptionCategory.Delete:
          {
            if (opt.index < list.length) {
              const item = list[opt.index]
              await environmentVariableStore.remove(item.id)
            }
          }
          break
        default:
          {
            if (opt.index < list.length) {
              const updateItem = list[opt.index]
              const item = opt.param
              let enabled = VariableStatus.Enabled
              if (item && !item.enabled) {
                enabled = VariableStatus.Disabled
              }
              updateItem.name = item?.key || ''
              updateItem.value = item?.value || ''
              updateItem.enabled = enabled
              updateItem.environment = envId
              await environmentVariableStore.update(updateItem)
            }
          }
          break
      }
    }

    return {
      environments,
      activeTab,
      openEnvironmentDialog,
      handleDeleteEnvironment,
      handleGlobalVariable,
      handleEnvironmentVariable,
      getEnvironmentVariables,
      globalVariables,
    }
  },
  render() {
    const { environments, activeTab, globalVariables } = this
    return (
      <NCard class={s.wrapper}>
        <div class={s.header}>
          <div class={s.title}>{i18nEnvManager('title')}</div>
          <NButton size="small" onClick={() => this.openEnvironmentDialog()}>
            {i18nEnvManager('createEnv')}
          </NButton>
        </div>
        <NTabs
          type="line"
          value={activeTab}
          onUpdateValue={(value) => {
            this.activeTab = value as string
          }}
        >
          <NTabPane name={globalTabKey} tab={i18nEnvManager('globalTab')}>
            <div class={s.tabContent}>
              <div class={s.tabTip}>{i18nCustomizeVariable('tips')}</div>
              <ExKeyValue spans={[8, 16]} params={convertKVParams(globalVariables)} onHandleParam={this.handleGlobalVariable} />
            </div>
          </NTabPane>
          {environments.map((env) => {
            return (
              <NTabPane key={env.id} name={env.id} tab={env.name || i18nEnvManager('untitledEnv')}>
                <div class={s.tabContent}>
                  <div class={s.envHeader}>
                    <div class={s.envMeta}>
                      <div class={s.envName}>{env.name || i18nEnvManager('untitledEnv')}</div>
                    </div>
                    <div class={s.envActions}>
                      <NButton size="small" onClick={() => this.openEnvironmentDialog(env)}>
                        {i18nCommon('modify')}
                      </NButton>
                      <NButton size="small" type="error" onClick={() => this.handleDeleteEnvironment(env)}>
                        {i18nCommon('delete')}
                      </NButton>
                    </div>
                  </div>
                  <NDivider />
                  <ExKeyValue
                    spans={[8, 16]}
                    params={convertKVParams(this.getEnvironmentVariables(env.id))}
                    onHandleParam={(opt) => {
                      this.handleEnvironmentVariable(env.id, opt)
                    }}
                  />
                </div>
              </NTabPane>
            )
          })}
        </NTabs>
      </NCard>
    )
  },
})
