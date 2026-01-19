import { NLayout, NLayoutHeader, NModal, useLoadingBar } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { defineComponent, onMounted } from 'vue'

import { VariableCategory } from './commands/variable'
import { i18nGlobalReqHeader } from './i18n'
import './main.css'
import { useDialogStore } from './stores/dialog'
import AppHeader from './views/AppHeader'
import AppSetting from './views/AppSetting'
import CookieSetting from './views/CookieSetting'
import EnvironmentManager from './views/EnvironmentManager'
import StoreSetting from './views/StoreSetting'
import VariableSetting from './views/VariableSetting'

export default defineComponent({
  name: 'App',
  setup() {
    const loadingBar = useLoadingBar()
    const dialogStore = useDialogStore()
    const { showSetting, showCookie, showEnvironmentManager, showStore, showReqHeader } = storeToRefs(dialogStore)
    const closeDialog = () => {
      dialogStore.$reset()
    }
    onMounted(() => {
      loadingBar.finish()
    })
    return {
      closeDialog,
      showSetting,
      showCookie,
      showStore,
      showEnvironmentManager,
      showReqHeader,
    }
  },
  render() {
    const { showSetting, showCookie, showEnvironmentManager, showStore, showReqHeader, closeDialog } = this
    const settingModal = (
      <NModal
        autoFocus={false}
        show={showSetting}
        closeOnEsc
        onEsc={() => {
          closeDialog()
        }}
        onMaskClick={() => {
          closeDialog()
        }}
      >
        <AppSetting />
      </NModal>
    )
    const cookieModal = (
      <NModal
        autoFocus={false}
        show={showCookie}
        closeOnEsc
        onEsc={() => {
          closeDialog()
        }}
        onMaskClick={() => {
          closeDialog()
        }}
      >
        <CookieSetting />
      </NModal>
    )
    const environmentManagerModal = (
      <NModal
        autoFocus={false}
        show={showEnvironmentManager}
        closeOnEsc
        onEsc={() => {
          closeDialog()
        }}
        onMaskClick={() => {
          closeDialog()
        }}
      >
        <EnvironmentManager />
      </NModal>
    )
    const reqHeaderModal = (
      <NModal
        autoFocus={false}
        show={showReqHeader}
        closeOnEsc
        onEsc={() => {
          closeDialog()
        }}
        onMaskClick={() => {
          closeDialog()
        }}
      >
        <VariableSetting category={VariableCategory.GlobalReqHeaders} title={i18nGlobalReqHeader('title')} tips={i18nGlobalReqHeader('tips')} />
      </NModal>
    )
    const storeModal = (
      <NModal
        autoFocus={false}
        show={showStore}
        onEsc={() => {
          closeDialog()
        }}
        onMaskClick={() => {
          closeDialog()
        }}
      >
        <StoreSetting />
      </NModal>
    )
    return (
      <NLayout>
        {settingModal}
        {cookieModal}
        {storeModal}
        {environmentManagerModal}
        {reqHeaderModal}
        <NLayoutHeader bordered>
          <AppHeader />
        </NLayoutHeader>
        <div>
          <router-view />
        </div>
      </NLayout>
    )
  },
})
