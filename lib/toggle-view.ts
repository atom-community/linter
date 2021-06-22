import { CompositeDisposable, Emitter, Disposable } from 'atom'

let SelectListViewImport: (typeof import("atom-select-list"))["default"]

type ToggleAction = 'enable' | 'disable'

export default class ToggleView {
  private action: ToggleAction
  private emitter: Emitter = new Emitter()
  private providers: Array<string>
  private subscriptions: CompositeDisposable = new CompositeDisposable()
  private disabledProviders: Array<string> = []

  constructor(action: ToggleAction, providers: Array<string>) {
    this.action = action
    this.providers = providers

    this.subscriptions.add(
      this.emitter,
      atom.config.observe('linter.disabledProviders', disabledProviders => {
        this.disabledProviders = disabledProviders
      }),
    )
  }
  getItems(): Array<string> {
    if (this.action === 'disable') {
      return this.providers.filter(name => !this.disabledProviders.includes(name))
    }
    return this.disabledProviders
  }
  process(name: string): void {
    if (this.action === 'disable') {
      this.disabledProviders.push(name)
      this.emitter.emit('did-disable', name)
    } else {
      const index = this.disabledProviders.indexOf(name)
      if (index !== -1) {
        this.disabledProviders.splice(index, 1)
      }
    }
    atom.config.set('linter.disabledProviders', this.disabledProviders)
  }
  async show() {
    if (SelectListViewImport === undefined) {
      SelectListViewImport = (await import('atom-select-list')).default
    }
    const selectListView = new SelectListViewImport({
      items: this.getItems(),
      emptyMessage: 'No matches found',
      // @ts-ignore
      elementForItem: (item: string) => {
        const li = document.createElement('li')
        li.textContent = item
        return li
      },
      // @ts-ignore
      didConfirmSelection: (item: string) => {
        try {
          this.process(item)
          this.dispose()
        } catch (e) {
          console.error('[Linter] Unable to process toggle:', e)
        }
      },
      didCancelSelection: () => {
        this.dispose()
      },
      didConfirmEmptySelection: () => {
        this.dispose()
      },
    })
    const panel = atom.workspace.addModalPanel({ item: selectListView })

    selectListView.focus()
    this.subscriptions.add(
      new Disposable(function () {
        panel.destroy()
      }),
    )
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  onDidDispose(callback: () => any): Disposable {
    return this.emitter.on('did-dispose', callback)
  }
  onDidDisable(callback: (name: string) => any): Disposable {
    return this.emitter.on('did-disable', callback)
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  dispose() {
    this.emitter.emit('did-dispose')
    this.subscriptions.dispose()
  }
}
