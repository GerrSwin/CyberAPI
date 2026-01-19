import { Component } from 'vue'

import Collection from '../views/Collection'
import Dashboard from '../views/Dashboard'

export interface Router {
  path: string
  name: string
  component: Component | Promise<Component>
}

export const names = {
  home: 'home',
  collection: 'collection',
}

export const routes: Router[] = [
  {
    path: '/',
    name: names.home,
    component: Dashboard,
  },
  {
    path: '/collection',
    name: names.collection,
    component: Collection,
  },
]
