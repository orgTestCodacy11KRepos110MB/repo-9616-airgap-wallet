import { BaseIACService, ProtocolService, SerializerService, UiEventElementsService } from '@airgap/angular-core'
import { BeaconMessageType, SigningType, SignPayloadResponseInput } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import {
  AccountShareResponse,
  AirGapMarketWallet,
  IACMessageDefinitionObject,
  IACMessageType,
  MessageSignResponse
} from '@airgap/coinlib-core'

import { AccountProvider } from '../account/account.provider'
import { BeaconService } from '../beacon/beacon.service'
import { DataService, DataServiceKey } from '../data/data.service'
import { PriceService } from '../price/price.service'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

import { AddressHandler } from './custom-handlers/address-handler'
import { BeaconHandler } from './custom-handlers/beacon-handler'
import { AccountSync } from 'src/app/types/AccountSync'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'

@Injectable({
  providedIn: 'root'
})
export class IACService extends BaseIACService {
  constructor(
    uiEventElementsService: UiEventElementsService,
    serializerService: SerializerService,
    public beaconService: BeaconService,
    accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly protocolService: ProtocolService,
    private readonly storageSerivce: WalletStorageService,
    private readonly priceService: PriceService,
    private readonly router: Router
  ) {
    super(uiEventElementsService, serializerService, Promise.resolve(), [
      new BeaconHandler(beaconService),
      new AddressHandler(accountProvider, dataService, router)
    ])

    this.serializerMessageHandlers[IACMessageType.AccountShareResponse] = this.handleWalletSync.bind(this)
    this.serializerMessageHandlers[IACMessageType.TransactionSignResponse] = this.handleSignedTransaction.bind(this)
    this.serializerMessageHandlers[IACMessageType.MessageSignResponse] = this.handleMessageSignResponse.bind(this)
  }

  public async relay(data: string | string[]): Promise<void> {
    const info = {
      data
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async handleWalletSync(_data: string | string[], deserializedSyncs: IACMessageDefinitionObject[]): Promise<boolean> {
    this.storageSerivce.set(WalletStorageKey.DEEP_LINK, true).catch(handleErrorSentry(ErrorCategory.STORAGE))

    const accountSyncs: AccountSync[] = await Promise.all(
      deserializedSyncs.map(async (deserializedSync: IACMessageDefinitionObject) => {
        const accountShare: AccountShareResponse = deserializedSync.payload as AccountShareResponse
        const protocol = await this.protocolService.getProtocol(deserializedSync.protocol)
        const wallet: AirGapMarketWallet = new AirGapMarketWallet(
          protocol,
          accountShare.publicKey,
          accountShare.isExtendedPublicKey,
          accountShare.derivationPath,
          accountShare.masterFingerprint || /* backwards compatibility */ '',
          accountShare.isActive === undefined
            ? /* backwards compatibility */ AirGapWalletStatus.ACTIVE
            : accountShare.isActive
            ? AirGapWalletStatus.ACTIVE
            : AirGapWalletStatus.HIDDEN,
          this.priceService
        )

        return {
          wallet,
          groupId: accountShare.groupId,
          groupLabel: accountShare.groupLabel
        }
      })
    )

    if (this.router) {
      this.dataService.setData(DataServiceKey.ACCOUNTS, accountSyncs)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.ACCOUNTS}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  public async handleSignedTransaction(_data: string | string[], messageDefinitionObjects: IACMessageDefinitionObject[]): Promise<boolean> {
    console.log('handleSignedTransaction', messageDefinitionObjects)
    if (this.router) {
      const info = {
        messageDefinitionObjects: messageDefinitionObjects
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  private async handleMessageSignResponse(_data: string | string[], deserializedMessages: IACMessageDefinitionObject[]): Promise<boolean> {
    const cachedRequest = await this.beaconService.getVaultRequest(deserializedMessages[0].id)
    const messageSignResponse = deserializedMessages[0].payload as MessageSignResponse
    const response: SignPayloadResponseInput = {
      type: BeaconMessageType.SignPayloadResponse,
      id: cachedRequest[0].id,
      signature: messageSignResponse.signature,
      signingType: SigningType.RAW
    }
    await this.beaconService.respond(response)
    return false
  }
}
