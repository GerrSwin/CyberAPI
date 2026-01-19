import { defineStore } from 'pinia'

export const useDialogStore = defineStore('dialogs', {
  state: () => {
    return {
      showSetting: false,
      showCookie: false,
      showStore: false,
      showEnvironmentManager: false,
      showReqHeader: false,
    }
  },
  actions: {
    toggleSettingDialog(shown: boolean) {
      this.showSetting = shown
    },
    toggleCookieDialog(shown: boolean) {
      this.showCookie = shown
    },
    toggleStoreDialog(shown: boolean) {
      this.showStore = shown
    },
    toggleEnvironmentManagerDialog(shown: boolean) {
      this.showEnvironmentManager = shown
    },
    toggleReqHeaderDialog(shown: boolean) {
      this.showReqHeader = shown
    },
  },
})
