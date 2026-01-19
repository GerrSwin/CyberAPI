import dayjs from 'dayjs'
import { sortBy } from 'lodash-es'
import { defineStore } from 'pinia'
import { createProxy, deleteProxy, listProxy, ProxySetting, ProxyStatus, updateProxy } from '../commands/proxy'

export const useProxyStore = defineStore('proxies', {
  state: () => {
    return {
      proxies: [] as ProxySetting[],
      fetching: false,
      saving: false,
      removing: false,
    }
  },
  actions: {
    async fetch() {
      if (this.fetching) {
        return
      }
      this.fetching = true
      try {
        const result = await listProxy()
        const normalized = result.map((item) =>
          Object.assign({}, item, {
            enabled: item.enabled ?? ProxyStatus.Enabled,
          }),
        )
        this.proxies = sortBy(normalized, (item) => item.proxy || item.id)
      } finally {
        this.fetching = false
      }
    },
    async add(proxy: ProxySetting) {
      if (this.saving) {
        return
      }
      this.saving = true
      try {
        await createProxy(proxy)
        const arr = this.proxies.slice(0)
        arr.push(proxy)
        this.proxies = sortBy(arr, (item) => item.proxy || item.id)
      } finally {
        this.saving = false
      }
    },
    async update(proxy: ProxySetting) {
      if (this.saving) {
        return
      }
      this.saving = true
      try {
        proxy.updatedAt = dayjs().format()
        await updateProxy(proxy)
        const arr = this.proxies.slice(0)
        let found = -1
        arr.forEach((item, index) => {
          if (item.id === proxy.id) {
            found = index
          }
        })
        if (found !== -1) {
          arr[found] = proxy
        }
        this.proxies = sortBy(arr, (item) => item.proxy || item.id)
      } finally {
        this.saving = false
      }
    },
    async remove(id: string) {
      if (this.removing) {
        return
      }
      this.removing = true
      try {
        await deleteProxy([id])
        this.proxies = this.proxies.filter((item) => item.id !== id)
      } finally {
        this.removing = false
      }
    },
    getByID(id: string) {
      return this.proxies.find((item) => item.id === id)
    },
  },
})
