// API list with drag-and-drop
import { sortBy, uniq } from 'lodash-es'
import { NGradientText, NInput, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import type { VNode } from 'vue'
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import s from './items.module.css'

import { APIFolder } from '../../commands/api_folder'
import { APISetting } from '../../commands/api_setting'
import { HTTPMethod } from '../../commands/http_request'
import {
  nodeAddClass,
  nodeGetDataValue,
  nodeGetOffset,
  nodeGetOffsetHeightWidth,
  nodeHasClass,
  nodeInsertAt,
  nodeRemove,
  nodeRemoveClass,
  nodeSetStyle,
  nodGetScrollTop,
} from '../../helpers/html'
import { isMatchTextOrPinYin, showError } from '../../helpers/util'
import { closeFolderIcon, openFolderIcon } from '../../icons'
import { useAPICollectionStore } from '../../stores/api_collection'
import { useAPIFolderStore } from '../../stores/api_folder'
import { SettingType, useAPISettingStore } from '../../stores/api_setting'
import { useSettingStore } from '../../stores/setting'
import APISettingTreeItemDropdown from './item_dropdown'

const folderIconStyle = {
  '--folder-icon-open': `url(${openFolderIcon})`,
  '--folder-icon-close': `url(${closeFolderIcon})`,
} as Record<string, string>

enum OverType {
  Over = 0,
  Top = 1,
  Bottom = 2,
}

interface TreeItem {
  id: string
  name: string
  settingType: string
  method: string
  uri: string
  children: TreeItem[]
  expanded: boolean
  parent: string
  childIndex: number
  hidden: boolean
  isLastChild: boolean
}

function getMethodColorType(method: string) {
  switch (method) {
    case HTTPMethod.DELETE:
      return 'error'
      break
    case HTTPMethod.PATCH:
    case HTTPMethod.PUT:
    case HTTPMethod.POST:
      return 'success'
      break
    default:
      return 'info'
      break
  }
}

function convertToTreeItems(params: {
  apiFolders: APIFolder[]
  apiSettings: APISetting[]
  expandedFolders: string[]
  topTreeItems: string[]
  keyword: string
}): TreeItem[] {
  const { apiFolders, apiSettings, expandedFolders, topTreeItems } = params
  const map = new Map<string, TreeItem>()

  const keyword = params.keyword.toLowerCase()

  const methodReg = /"method":"(\S+?)"/
  const uriReg = /"uri":"(\S+?)"/
  apiSettings.forEach((item) => {
    let method = ''
    let uri = ''
    if (item.setting) {
      let result = methodReg.exec(item.setting)
      if (result?.length === 2) {
        method = result[1]
      }
      result = uriReg.exec(item.setting)
      if (result?.length === 2) {
        uri = result[1].replace(/{{\S+}}/, '')
      }
    }
    map.set(item.id, {
      method,
      uri,
      id: item.id,
      name: item.name,
      settingType: SettingType.HTTP,
      children: [],
      expanded: false,
      parent: '',
      childIndex: -1,
      hidden: false,
      isLastChild: false,
    })
  })

  apiFolders.forEach((item) => {
    map.set(item.id, {
      id: item.id,
      uri: '',
      name: item.name,
      settingType: SettingType.Folder,
      children: [],
      expanded: expandedFolders.includes(item.id),
      parent: '',
      childIndex: -1,
      hidden: false,
      method: '',
      isLastChild: false,
    })
  })

  // Track ids already set as children
  const children = [] as string[]
  apiFolders.forEach((item) => {
    if (!item.children) {
      return
    }
    const treeItem = map.get(item.id)
    if (!treeItem) {
      return
    }
    const arr: string[] = []
    item.children.split(',').forEach((child) => {
      if (!child || child === treeItem.id) {
        return
      }
      arr.push(child)
    })
    const childCount = arr.length
    arr.forEach((child, index) => {
      const subItem = map.get(child)
      if (!subItem) {
        return
      }
      subItem.parent = treeItem.id
      subItem.childIndex = treeItem.children.length
      subItem.isLastChild = index === childCount - 1
      treeItem.children.push(subItem)
      children.push(child)
    })
  })
  let result = [] as TreeItem[]
  map.forEach((item, key) => {
    if (children.includes(key)) {
      return
    }
    result.push(item)
  })
  if (keyword) {
    const methodKeyword = keyword.toUpperCase()
    const shouldBeHide = (item: TreeItem) => {
      // Match method
      // Match url
      // If the current item matches, show its children
      if (item.method === methodKeyword || item.uri.toLowerCase().includes(keyword) || isMatchTextOrPinYin(item.name, keyword)) {
        return
      }
      let hidden = true
      item.children.forEach((item) => {
        shouldBeHide(item)
        // If any child is not hidden, the parent is not hidden
        if (!item.hidden) {
          hidden = false
        }
      })

      item.hidden = hidden
    }
    result.forEach(shouldBeHide)
  }
  const filterVisible = (item: TreeItem) => {
    if (item.hidden) {
      return false
    }
    item.children = item.children.filter(filterVisible)
    return true
  }
  result = result.filter(filterVisible)
  return sortBy(result, (item) => {
    return topTreeItems.indexOf(item.id)
  })
}

export default defineComponent({
  name: 'APISettingTreeItems',
  props: {
    keyword: {
      type: String,
      default: () => '',
    },
  },
  setup() {
    const message = useMessage()
    const route = useRoute()
    const wrapper = ref(null)
    const collection = route.query.collection as string

    const collectionStore = useAPICollectionStore()
    const apiFolderStore = useAPIFolderStore()
    const apiSettingStore = useAPISettingStore()
    const { apiFolders } = storeToRefs(apiFolderStore)
    const { expandedFolders, topTreeItems } = storeToRefs(collectionStore)
    const { isDark } = storeToRefs(useSettingStore())
    const { apiSettings, selectedID } = storeToRefs(apiSettingStore)

    let currentTreeItems = [] as TreeItem[]
    let topTreeItemIDList = [] as string[]
    const renameItem = ref({
      name: '',
      id: '',
    })
    const renameValue = ref('')

    const setTreeItems = (items: TreeItem[], topItems: string[]) => {
      currentTreeItems = items
      topTreeItemIDList = topItems
    }

    const handleClick = async (item: TreeItem) => {
      try {
        // Handle folder
        if (item.settingType === SettingType.Folder) {
          let fn = collectionStore.openFolder
          if (item.expanded) {
            fn = collectionStore.closeFolder
          }
          await fn(collection, item.id)
        } else {
          apiSettingStore.select(item.id)
        }
      } catch (err) {
        showError(message, err)
      }
    }

    const handleMove = async (moveIndex: number, targetIndex: number, overType: OverType) => {
      // TODO handle the last element case
      // Check whether isOver move overlaps target
      const moveItem = currentTreeItems[moveIndex]
      const targetItem = currentTreeItems[targetIndex]
      // Ignore if the element does not exist
      if (!moveItem || !targetItem) {
        return
      }
      // Do not handle the same element
      if (moveItem.id === targetItem.id) {
        return
      }
      let parentID = targetItem.parent
      let insertBefore = targetItem.id
      // If it's the last element and bottom
      if (targetIndex === currentTreeItems.length - 1 && overType === OverType.Bottom) {
        insertBefore = ''
      }

      if (targetItem.settingType === SettingType.Folder) {
        // Drag onto a file to add a child
        if (overType === OverType.Over) {
          parentID = targetItem.id
          insertBefore = ''
        } else {
          // If there's an element before the folder and it has a parent
          // And it's the last element in that folder
          // Then add to that element's folder
          const newTarget = currentTreeItems[targetIndex - 1]
          if (newTarget && newTarget.parent && newTarget.isLastChild) {
            parentID = newTarget.parent
            insertBefore = ''
          }
        }
      }
      try {
        await apiFolderStore.addChild({
          id: parentID,
          children: [moveItem.id],
          before: insertBefore,
        })
        if (!parentID) {
          // Set in top items
          const moveItemIndex = topTreeItemIDList.indexOf(moveItem.id)
          if (moveItemIndex !== -1) {
            topTreeItemIDList.splice(moveItemIndex, 1)
          }
          const index = topTreeItemIDList.indexOf(insertBefore)
          if (index === -1) {
            topTreeItemIDList.push(moveItem.id)
          } else {
            topTreeItemIDList.splice(index, 0, moveItem.id)
          }
          await collectionStore.updateTopTreeItems(collection, uniq(topTreeItemIDList))
        }
      } catch (err) {
        showError(message, err)
      }
    }

    let target: EventTarget
    let moveTarget: EventTarget
    let originClientY = 0
    let originOffset = 0
    let targetHeight = 0
    let currentInsertIndex = -1
    let isDragging = false
    const draggingClass = 'dragging'
    let listItems = [] as HTMLCollection[]
    let mousedownFiredAt = 0
    let maxMoveOffsetX = 0
    const handleMousemove = (e: MouseEvent) => {
      // Process every 2px of movement
      if (isDragging && e.clientY % 2 !== 0) {
        e.preventDefault()
        return
      }
      const offset = e.clientY - originClientY
      if (!isDragging && Math.abs(offset) > 5 && Date.now() - mousedownFiredAt < 500) {
        isDragging = true
        nodeAddClass(wrapper.value, draggingClass)
        nodeAddClass(document.body, 'disableUserSelect')

        // Submitting common methods to HTML can't be copied (TODO confirm why)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        moveTarget = target.cloneNode(true)
        nodeSetStyle(moveTarget, {
          position: 'absolute',
          left: '0px',
          right: '0px',
        })
        nodeAddClass(moveTarget, 'dragItem')

        nodeInsertAt(wrapper.value, moveTarget, 0)
      }

      if (isDragging) {
        const top = offset + originOffset + nodGetScrollTop(wrapper.value)
        const index = Math.round(top / targetHeight)
        if (currentInsertIndex !== index) {
          if (currentInsertIndex !== -1) {
            nodeRemoveClass(listItems[currentInsertIndex], 'insertBefore')
          }
          if (listItems.length > index) {
            nodeAddClass(listItems[index], 'insertBefore')
            currentInsertIndex = index
          }
        }
        nodeSetStyle(moveTarget, {
          top: `${top}px`,
        })
        e.preventDefault()
      }
    }

    const handleMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', handleMousemove)
      document.removeEventListener('mouseup', handleMouseup)
      nodeRemoveClass(document.body, 'disableUserSelect')
      if (!isDragging) {
        return
      }

      let overType = OverType.Bottom
      const overOffset = 5
      const offset = Math.abs(e.clientY - originClientY) % targetHeight
      // Override
      if (offset <= overOffset || targetHeight - offset <= overOffset) {
        overType = OverType.Over
      } else if (offset < targetHeight * 0.4) {
        overType = OverType.Top
      }

      isDragging = false

      const moveItemIndex = Number.parseInt(nodeGetDataValue(moveTarget, 'index'))
      const targetItemIndex = Number.parseInt(nodeGetDataValue(listItems[currentInsertIndex], 'index'))

      nodeRemove(moveTarget)
      nodeRemoveClass(listItems[currentInsertIndex], 'insertBefore')
      nodeRemoveClass(wrapper.value, draggingClass)

      if (maxMoveOffsetX && e.clientX > maxMoveOffsetX) {
        return
      }

      handleMove(moveItemIndex, targetItemIndex, overType)
    }
    const handleMousedown = (e: MouseEvent) => {
      isDragging = false
      // No target or non-left click
      if (!e.currentTarget || e.button > 1) {
        return
      }
      mousedownFiredAt = Date.now()
      // TODO this prevents copying; investigate later
      // e.preventDefault();
      currentInsertIndex = -1
      target = e.currentTarget
      originOffset = nodeGetOffset(target).top - nodeGetOffset(wrapper.value).top
      targetHeight = nodeGetOffsetHeightWidth(target).height
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      listItems = wrapper.value.children[0].children
      originClientY = e.clientY
      document.addEventListener('mousemove', handleMousemove)
      document.addEventListener('mouseup', handleMouseup)
      if (wrapper.value) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        maxMoveOffsetX = wrapper.value.clientWidth as number
      }
    }

    const resetRename = () => {
      renameValue.value = ''
      renameItem.value = {
        name: '',
        id: '',
      }
    }

    const handelRename = async () => {
      // No changes; no update needed
      const name = renameValue.value
      const id = renameItem.value.id
      if (!name || !id) {
        resetRename()
        return
      }
      try {
        const folder = apiFolderStore.findByID(id)
        if (folder) {
          folder.name = name
          await apiFolderStore.updateByID(id, folder)
        } else {
          const apiSetting = apiSettingStore.findByID(id)
          apiSetting.name = name
          await apiSettingStore.updateByID(id, apiSetting)
        }
      } catch (err) {
        showError(message, err)
      } finally {
        resetRename()
      }
    }
    const handleKeydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      switch (key) {
        case 'escape':
          {
            resetRename()
          }
          break
        case 'enter':
          {
            handelRename()
          }
          break

        default:
          break
      }
    }
    document.addEventListener('keydown', handleKeydown)
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
    })

    return {
      renameValue,
      renameItem,
      selectedID,
      topTreeItems,
      expandedFolders,
      isDark,
      apiFolders,
      apiSettings,
      handleClick,
      handleMousedown,
      handelRename,
      setTreeItems,
      wrapper,
    }
  },
  render() {
    const { keyword } = this.$props
    const { apiFolders, apiSettings, isDark, expandedFolders, topTreeItems, setTreeItems, selectedID, renameItem } = this
    const treeItems = convertToTreeItems({
      apiFolders,
      apiSettings,
      expandedFolders,
      topTreeItems,
      keyword,
    })
    const showAllChildren = keyword.trim().length !== 0
    const itemList = [] as VNode[]
    // Currently displayed tree item
    const currentTreeItems = [] as TreeItem[]
    // Top-level items
    const topTreeItemIDList = [] as string[]
    let treeItemIndex = 0
    const appendToList = (items: TreeItem[], level: number) => {
      if (!items || items.length === 0) {
        return
      }
      items.forEach((item) => {
        if (level === 0) {
          topTreeItemIDList.push(item.id)
        }
        let folderClass = 'folder'
        if (item.expanded) {
          folderClass += ' open'
        } else {
          folderClass += ' close'
        }
        let icon = <span class={folderClass}></span>
        const isFolder = item.settingType === SettingType.Folder
        if (!isFolder) {
          icon = (
            <NGradientText class="method" type={getMethodColorType(item.method)}>
              {item.method || HTTPMethod.GET}
            </NGradientText>
          )
        }

        const style = {
          'padding-left': `${level * 20}px`,
        }
        let cls = isDark ? '' : 'light'
        if (item.id === selectedID) {
          cls += ' selected'
        }
        if (item.id === renameItem.id) {
          cls += ' renameItem'
        }
        const onClick =
          item.id !== selectedID
            ? () => {
                if (this.renameItem.id) {
                  this.renameItem = {
                    id: '',
                    name: '',
                  }
                }

                this.handleClick(item)
              }
            : undefined
        const onDblclick = !isFolder
          ? (e: MouseEvent) => {
              if (!nodeHasClass(e.target, 'name')) {
                return
              }
              this.renameItem = {
                id: item.id,
                name: item.name,
              }
            }
          : undefined
        currentTreeItems.push(item)
        itemList.push(
          <li
            key={`${item.id}-${level}`}
            data-index={treeItemIndex}
            class={cls}
            style={style}
            onDblclick={onDblclick}
            onClick={onClick}
            onMousedown={this.handleMousedown}
          >
            <APISettingTreeItemDropdown id={item.id} apiSettingType={item.settingType} />
            {icon}
            {item.id === renameItem.id && (
              <NInput
                class="renameInput"
                key={item.id}
                bordered={false}
                clearable
                defaultValue={renameItem.name}
                onVnodeMounted={(node) => {
                  node.el?.getElementsByTagName('input')[0]?.focus()
                }}
                onUpdateValue={(value) => {
                  this.renameValue = value
                }}
                onInputBlur={() => {
                  this.handelRename()
                }}
              />
            )}
            {item.id !== renameItem.id && <span class="name">{item.name}</span>}
          </li>,
        )
        treeItemIndex++
        // If not expanded, no need to show children
        // And not showing all child items
        if (!item.expanded && !showAllChildren) {
          return
        }
        appendToList(item.children, level + 1)
      })
    }
    appendToList(treeItems, 0)
    setTreeItems(currentTreeItems, topTreeItemIDList)
    return (
      <div class={s.itemsWrapperClass} ref="wrapper" style={folderIconStyle}>
        <ul>{itemList}</ul>
      </div>
    )
  },
})
