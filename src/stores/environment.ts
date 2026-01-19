import dayjs from 'dayjs'
import { sortBy } from 'lodash-es'
import { defineStore } from 'pinia'
import { createEnvironment, deleteEnvironment, Environment, EnvironmentStatus, listEnvironment, updateEnvironment } from '../commands/environment'
import { createVariable, deleteVariable, listVariable, updateVariable, Variable, VariableCategory, VariableStatus } from '../commands/variable'

export const ENVRegexp = /\{\{([\S\s]+)\}\}/

export const useEnvironmentStore = defineStore('environments', {
  state: () => {
    return {
      environments: [] as Environment[],
      fetching: false,
      adding: false,
      updating: false,
      removing: false,
    }
  },
  actions: {
    async fetch(collection: string) {
      if (this.fetching) {
        return
      }
      this.fetching = true
      try {
        const result = await listEnvironment(collection)
        this.environments = sortBy(result, (item) => item.name)
      } finally {
        this.fetching = false
      }
    },
    async add(value: Environment) {
      if (this.adding) {
        return
      }
      this.adding = true
      try {
        await createEnvironment(value)
        const arr = this.environments.slice(0)
        arr.push(value)
        this.environments = sortBy(arr, (item) => item.name)
      } finally {
        this.adding = false
      }
    },
    async update(value: Environment) {
      if (this.updating) {
        return
      }
      this.updating = true
      try {
        value.updatedAt = dayjs().format()
        await updateEnvironment(value)
        const arr = this.environments.slice(0)
        let found = -1
        arr.forEach((item, index) => {
          if (item.id === value.id) {
            found = index
          }
        })
        if (found !== -1) {
          arr[found] = value
        }
        this.environments = sortBy(arr, (item) => item.name)
      } finally {
        this.updating = false
      }
    },
    async remove(ids: string[]) {
      if (this.removing) {
        return
      }
      this.removing = true
      try {
        await deleteEnvironment(ids)
        this.environments = this.environments.filter((item) => !ids.includes(item.id))
      } finally {
        this.removing = false
      }
    },
    getActive() {
      return this.environments.find((item) => item.enabled === EnvironmentStatus.Enabled)
    },
  },
})

export const useEnvironmentVariableStore = defineStore('environmentVariables', {
  state: () => {
    return {
      variables: [] as Variable[],
      fetching: false,
      adding: false,
      updating: false,
      removing: false,
    }
  },
  actions: {
    async fetch(collection: string) {
      if (this.fetching) {
        return
      }
      this.fetching = true
      try {
        const result = await listVariable(collection, VariableCategory.Environment)
        this.variables = sortBy(result, (item) => item.name)
      } finally {
        this.fetching = false
      }
    },
    async add(value: Variable) {
      if (this.adding) {
        return
      }
      this.adding = true
      try {
        value.category = VariableCategory.Environment
        await createVariable(value)
        this.variables.push(value)
      } finally {
        this.adding = false
      }
    },
    async update(value: Variable) {
      if (this.updating) {
        return
      }
      this.updating = true
      try {
        value.updatedAt = dayjs().format()
        value.category = VariableCategory.Environment
        await updateVariable(value)
        const arr = this.variables.slice(0)
        let found = -1
        arr.forEach((item, index) => {
          if (item.id === value.id) {
            found = index
          }
        })
        if (found !== -1) {
          arr[found] = value
        }
        this.variables = arr
      } finally {
        this.updating = false
      }
    },
    async remove(id: string) {
      if (this.removing) {
        return
      }
      this.removing = true
      try {
        await deleteVariable([id])
        this.variables = this.variables.filter((item) => item.id !== id)
      } finally {
        this.removing = false
      }
    },
    listByEnvironment(environmentId: string) {
      return this.variables.filter((item) => item.environment === environmentId)
    },
    listForActiveEnvironment(environmentId: string) {
      return this.variables.filter((item) => {
        if (!item.enabled || item.enabled !== VariableStatus.Enabled) {
          return false
        }
        if (!environmentId) {
          return !item.environment
        }
        if (!item.environment) {
          return true
        }
        return item.environment === environmentId
      })
    },
    getValue(name: string, environmentId: string) {
      if (!name) {
        return
      }
      const byEnv = this.variables.find((item) => {
        return item.enabled === VariableStatus.Enabled && item.name === name && item.environment === environmentId
      })
      if (byEnv) {
        return byEnv.value
      }
      const global = this.variables.find((item) => {
        return item.enabled === VariableStatus.Enabled && item.name === name && !item.environment
      })
      return global?.value
    },
  },
})
