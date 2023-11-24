import {
  AccountController,
  ConnectionController,
  AssetController,
  ConstantsUtil,
  CoreHelperUtil,
  EventsController,
  ModalController,
  NetworkController,
  RouterController,
  SnackController
} from '@web3modal/core'
import { StorageUtil } from '@web3modal/core'
import type { CaipNetworkCoinbaseNetwork } from '@web3modal/core'
import { UiHelperUtil, customElement } from '@web3modal/ui'
import { LitElement, html } from 'lit'
import { state } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import styles from './styles.js'

import { initOnRamp } from '@coinbase/cbpay-js'
import type { CBPayInstanceType } from '@coinbase/cbpay-js'

// -- Constants ----------------------------------------- //
const coinbaseAppID = process.env['NEXT_PUBLIC_COINBASE_APP_ID']

const tabs = [{ label: 'Tokens' }, { label: 'NFTs' }, { label: 'Activity' }]

@customElement('w3m-account-view')
export class W3mAccountView extends LitElement {
  public static override styles = styles

  // -- Members -------------------------------------------- //
  private usubscribe: (() => void)[] = []

  private readonly networkImages = AssetController.state.networkImages

  // -- State & Properties --------------------------------- //
  @state() private address = AccountController.state.address

  @state() private profileImage = AccountController.state.profileImage

  @state() private walletImageUrl = StorageUtil.getConnectedWalletImageUrl()

  @state() private walletName = StorageUtil.getConnectedWalletName()

  @state() private profileName = AccountController.state.profileName

  @state() private balance = AccountController.state.balance

  @state() private balanceSymbol = AccountController.state.balanceSymbol

  @state() private network = NetworkController.state.caipNetwork

  @state() private onrampInstance: CBPayInstanceType | null = null

  @state() private disconecting = false

  public constructor() {
    super()
    this.usubscribe.push(
      ...[
        AccountController.subscribe(val => {
          if (val.address) {
            this.address = val.address
            this.profileImage = val.profileImage
            this.profileName = val.profileName
            this.balance = val.balance
            this.balanceSymbol = val.balanceSymbol
          } else {
            ModalController.close()
          }
        })
      ],
      NetworkController.subscribeKey('caipNetwork', val => {
        if (val?.id) {
          this.network = val
          this.initializeOnRamp()
        }
      })
    )
  }

  public override disconnectedCallback() {
    this.usubscribe.forEach(unsubscribe => unsubscribe())
    this.onrampInstance?.destroy()
  }

  public override firstUpdated() {
    this.initializeOnRamp()
  }

  // -- Render -------------------------------------------- //
  public override render() {
    if (!this.address) {
      throw new Error('w3m-account-view: No account provided')
    }

    const networkImage = this.networkImages[this.network?.imageId ?? '']

    return html`
      <wui-flex
        flexDirection="column"
        .padding=${['0', 'xl', 'm', 'xl'] as const}
        alignItems="center"
        gap="l"
      >
        <wui-flex flexDirection="column" alignItems="center" gap="l">
          <wui-flex alignItems="center" justifyContent="center">
            <wui-flex class="account-button" alignItems="center" gap="s">
              <wui-flex alignItems="center" justifyContent="center" gap="xs">
                <wui-flex class="avatar-container" alignItems="center" justifyContent="center">
                  <wui-avatar
                    class="avatar"
                    alt=${this.address}
                    address=${this.address}
                    imageSrc=${ifDefined(this.profileImage)}
                  ></wui-avatar>
                  <wui-avatar
                    class="network-avatar"
                    alt=${this.address}
                    address=${this.address}
                    imageSrc=${ifDefined(networkImage)}
                  ></wui-avatar>
                </wui-flex>
                <wui-text variant="large-600" color="fg-100">
                  ${this.profileName
                    ? UiHelperUtil.getTruncateString({
                        string: this.profileName,
                        charsStart: 20,
                        charsEnd: 0,
                        truncate: 'end'
                      })
                    : UiHelperUtil.getTruncateString({
                        string: this.address,
                        charsStart: 4,
                        charsEnd: 6,
                        truncate: 'middle'
                      })}
                </wui-text>
              </wui-flex>
              <wui-icon color="fg-200" name="chevronBottom"></wui-icon>
            </wui-flex>
          </wui-flex>
          <wui-flex gap="s" flexDirection="column" alignItems="center">
            <wui-text variant="2xl-500" color="fg-100">
              ${CoreHelperUtil.formatBalance(this.balance, this.balanceSymbol)}
            </wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>

      <wui-flex flexDirection="column" gap="m">
        <wui-flex .padding=${['0', 'xl', '0', 'xl']} gap="1xs" class="account-links">
          <wui-flex size="lg" @click=${this.handleClickPay.bind(this)}>
            <wui-icon color="accent-100" name="wallet2"></wui-icon>
          </wui-flex>
          <wui-flex size="lg">
            <wui-icon color="accent-100" name="recycleHorizontal"></wui-icon>
          </wui-flex>
          <wui-flex size="lg">
            <wui-icon color="accent-100" name="arrowBottomCircle"></wui-icon>
          </wui-flex>
          <wui-flex size="lg">
            <wui-icon color="accent-100" name="send"></wui-icon>
          </wui-flex>
        </wui-flex>

        <wui-flex .padding=${['0', 'xl', '0', 'xl']}>
          <wui-tabs .tabs=${tabs}></wui-tabs>
        </wui-flex>

        <wui-flex flexDirection="column" gap="xs" .padding=${['0', 'xl', 'xl', 'xl'] as const}>
          <w3m-transactions-view></w3m-transactions-view>
        </wui-flex>
      </wui-flex>
    `
  }

  // -- Private ------------------------------------------- //
  private handleClickPay() {
    this.onrampInstance?.open()
  }

  private initializeOnRamp() {
    const networkName = this.network?.name
    const address = this.address

    if (!coinbaseAppID) {
      throw new Error('NEXT_PUBLIC_COINBASE_APP_ID is not set')
    }

    if (!networkName || !address) {
      return
    }

    const coinbaseChainName =
      ConstantsUtil.WC_COINBASE_PAY_SDK_CHAIN_NAME_MAP?.[networkName as CaipNetworkCoinbaseNetwork]

    if (this.onrampInstance) {
      this.onrampInstance.destroy()
    }

    initOnRamp(
      {
        appId: coinbaseAppID,
        widgetParameters: {
          destinationWallets: [
            {
              address,
              blockchains: [coinbaseChainName, 'base'],
              assets: ['USDC']
            }
          ],
          partnerUserId: address,
          connectedWalletImage: this.walletImageUrl ?? '',
          connectedWalletName: this.walletName ?? ''
        },
        experienceLoggedIn: 'popup',
        experienceLoggedOut: 'popup',
        closeOnExit: true,
        closeOnSuccess: true
      },
      (_, instance) => {
        this.onrampInstance = instance
      }
    )
  }

  private explorerBtnTemplate() {
    const { addressExplorerUrl } = AccountController.state

    if (!addressExplorerUrl) {
      return null
    }

    return html`
      <wui-button size="sm" variant="shade" @click=${this.onExplorer.bind(this)}>
        <wui-icon size="sm" color="inherit" slot="iconLeft" name="compass"></wui-icon>
        Block Explorer
        <wui-icon size="sm" color="inherit" slot="iconRight" name="externalLink"></wui-icon>
      </wui-button>
    `
  }

  private isAllowedNetworkSwitch() {
    const { requestedCaipNetworks } = NetworkController.state
    const isMultiNetwork = requestedCaipNetworks ? requestedCaipNetworks.length > 1 : false
    const isValidNetwork = requestedCaipNetworks?.find(({ id }) => id === this.network?.id)

    return isMultiNetwork || !isValidNetwork
  }

  private onCopyAddress() {
    try {
      if (this.address) {
        CoreHelperUtil.copyToClopboard(this.address)
        SnackController.showSuccess('Address copied')
      }
    } catch {
      SnackController.showError('Failed to copy')
    }
  }

  private onNetworks() {
    if (this.isAllowedNetworkSwitch()) {
      RouterController.push('Networks')
    }
  }

  private onTransactions() {
    EventsController.sendEvent({ type: 'track', event: 'CLICK_TRANSACTIONS' })
    RouterController.push('Transactions')
  }

  private async onDisconnect() {
    try {
      this.disconecting = true
      await ConnectionController.disconnect()
      EventsController.sendEvent({ type: 'track', event: 'DISCONNECT_SUCCESS' })
      ModalController.close()
    } catch {
      EventsController.sendEvent({ type: 'track', event: 'DISCONNECT_ERROR' })
      SnackController.showError('Failed to disconnect')
    } finally {
      this.disconecting = false
    }
  }

  private onExplorer() {
    const { addressExplorerUrl } = AccountController.state
    if (addressExplorerUrl) {
      CoreHelperUtil.openHref(addressExplorerUrl, '_blank')
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'w3m-account-view': W3mAccountView
  }
}
