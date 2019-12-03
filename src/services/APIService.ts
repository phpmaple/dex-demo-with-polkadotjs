import { ApiRx, SubmittableResult } from '@polkadot/api'
import { Signer } from '@polkadot/api/types'
import { web3Accounts } from '@polkadot/extension-dapp'
import { WsProvider } from '@polkadot/rpc-provider'
import keyring from '@polkadot/ui-keyring'
import Lodash from 'lodash'
import BN from 'bn.js'
import { Struct, u128, H256, Option } from '@polkadot/types'
import { Balance, Index, SetIndex } from '@polkadot/types/interfaces'
import { switchMap, first, map, filter, tap, takeWhile } from 'rxjs/operators'
import { combineLatest } from 'rxjs/internal/observable/combineLatest'
import RuntimeTypes from '../runtimeTypes'

export type Price = u128
export type Hash = H256
export type PairBalance = [Balance, Balance, Balance, Balance] // base free. base freezed. quote free. quote freezed

export enum Module {
  tokenModule,
  tradeModule
}

export enum TokenModuleEvent {
  Issued, // (AccountId, Hash, Balance)
  Transferd,
  Freezed,
  UnFreezed
}

export enum TradeModuleEvent {
  TradePairCreated, // (AccountId, Hash, TradePair),

  // (accountId, baseTokenHash, quoteTokenHash, orderHash, LimitOrder)
  OrderCreated, // (AccountId, Hash, Hash, Hash, LimitOrder),

  // (accountId, baseTokenHash, quoteTokenHash, tradeHash, Trade)
  TradeCreated, // (AccountId, Hash, Hash, Hash, Trade),

  // (accountId, orderHash)
  OrderCanceled // (AccountId, Hash),
}

export interface TradePair {
  hash: string
  base: string
  quote: string
  latest_matched_price: number
  one_day_trade_volume: number
  one_day_highest_price: number
  one_day_lowest_price: number
}

export interface OrderLinkedItem extends Struct {
  prev?: BN
  next?: BN
  price?: BN
  buy_amount: Price
  sell_amount: Price
  orders: Hash[]
}

export enum OrderType {
  Buy,
  Sell
}

export enum OrderStatus {
  Created,
  PartialFilled,
  Filled,
  Canceled
}

export interface Trade {
  hash: string
  base: string
  quote: string
  buyer: string
  seller: string
  maker: string
  taker: string
  otype: OrderType
  price: number
  base_amount: number
  quote_amount: number
}

export interface Order {
  hash: string
  base: string
  quote: string
  owner: string
  sell_amount: number
  buy_amount: number
  remained_buy_amount: number
  remained_sell_amount: number
  otype: OrderType
  price: number
  status: OrderStatus
}

export const AccountIds = [
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // BOB
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // ALICE
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', // CHARLIE
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', // DAVE
  '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw', // EVE
  '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL' // FERDIE
]

let apiInstance: ApiUtils

export default class ApiUtils {
  public api?: ApiRx

  private url: string

  public isLoadKeyring = false

  static account: string = AccountIds[0] // BOB

  constructor() {
    if (apiInstance === undefined) {
      apiInstance = this
    }

    this.url = 'ws://47.100.239.204:9944'
  }

  public static switchAccount(index: number) {
    ApiUtils.account = AccountIds[index]
  }

  public setSigner(signer: Signer) {
    if (this.api) { this.api.setSigner(signer);}
  }

  public async init() {
    const provider = new WsProvider(this.url)

    this.api = await ApiRx.create({
      provider,
      types: RuntimeTypes.types
    }).toPromise()

    if (!this.isLoadKeyring) {
      keyring.loadAll({ ss58Format: 42, type: 'sr25519' })
      this.isLoadKeyring = true
    }
  }

  private static getPairFrom() {
    return keyring.getPair(ApiUtils.account)
  }

  subNewBlock() {
    return this.api?.isReady.pipe(
      switchMap(api => api.rpc.chain.subscribeNewHeads())
    )
  }

  private static handlerSubResult(
    result: SubmittableResult,
    resolve: (value?: undefined) => void
  ) {
    // result.findRecord("tradeModule", "Issued")
    if (result.status.isFinalized) {
      let datajson: any // eslint-disable-line @typescript-eslint/no-explicit-any
      result.events.forEach(({ event: { data } }) => {
        datajson = JSON.parse(data.toString())
        console.log(datajson)

        resolve({ ...datajson })
      })
    }
  }

  async issueToken(
    symbol: string,
    amount: number,
    specialNonce?: number
  ): Promise<[string, string, number]> {
    // accountId, hash, amount
    let nonce = specialNonce
    if (specialNonce === undefined) {
      nonce = (await this.nonce())?.toNumber()
      if (nonce === undefined) {
        return Promise.reject()
      }
    }
    return new Promise(resolve => {
      const account = ApiUtils.getPairFrom()
      if (this.api) {
        this.api.tx.tokenModule
          .issue(symbol, amount)
          .signAndSend(account, { nonce })
          .subscribe(value => {
            ApiUtils.handlerSubResult(value, resolve)
          }
          )
      }
    })
  }

  public nonce() {
    return this.api?.query.system
      .accountNonce<SetIndex>(ApiUtils.account)
      .pipe(first())
      .toPromise()
  }

  async transferTo(
    accountId: string,
    tokenHash: string,
    amount: number,
    specialNonce?: number
  ) {
    let nonce = specialNonce
    if (specialNonce === undefined) {
      nonce = (await this.nonce())?.toNumber()
      if (nonce === undefined) {
        return Promise.reject()
      }
    }
    const account = ApiUtils.getPairFrom()
    return this.api?.tx.tokenModule
      .transfer(tokenHash, accountId, amount)
      .signAndSend(account, { nonce })
      .pipe(
        filter(v => v.isFinalized),
        map(
          value =>
            value.findRecord(
              Module[Module.tokenModule],
              TokenModuleEvent[TokenModuleEvent.Transferd]
            )?.event?.data
        ),
        filter(v => v !== undefined),
        map(value => value && JSON.parse(value.toString())),
        // tap(v => console.log('next--', v)),
        first()
      )
      .toPromise()
  }

  async tpOwnedTrades(hash: string) {
    return new Promise(resolve => {
      if (this.api) {
      this.api.query.tradeModule
        .tradePairOwnedTrades(hash)
        .subscribe((v: unknown) => {
          resolve(v)
        })
      }
    })
  }

  async ordersWith(hash: string[]) {
    return new Promise(resolve => {
      if (this.api) {
      this.api.query.tradeModule.orders.multi(hash).subscribe(v => {
        resolve(v)
      })
    }
    })
  }

  async tradesWith(hash: string[]) {
    return new Promise(resolve => {
      if (this.api) {
      this.api.query.tradeModule.trades.multi(hash).subscribe(v => {
        resolve(v)
      })
    }
    })
  }

  async cancelOrder(hash: string) {
    return new Promise(resolve => {
      const account = ApiUtils.getPairFrom()
      if (this.api) {
      this.api.tx.tradeModule
        .cancelLimitOrder(hash)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve)
        })
      }
    })
  }

  async createLimitOrder(
    base: string,
    quote: string,
    otype: number,
    price: number,
    amount: number
  ): Promise<[string, string, string, string, Order]> {
    // (accountId, baseTokenHash, quoteTokenHash, orderHash, LimitOrder)
    // const allAccounts = await web3Accounts()

    return new Promise(resolve => {
      const account = ApiUtils.getPairFrom()
      let sellAmount
      const realPrice = price * 10 ** 8

      if (otype === 0) {
        sellAmount = price * amount
      } else {
        sellAmount = amount
      }
      if (this.api) {
      this.api.tx.tradeModule
        .createLimitOrder(base, quote, otype, realPrice, sellAmount)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve)
        })
      }
    })
  }

  createTradePair(
    base: string,
    quote: string
  ): Promise<[string, string, TradePair]> {
    // accountId, hash, tp
    return new Promise(resolve => {
      const account = ApiUtils.getPairFrom()
      if (this.api) {
      this.api.tx.tradeModule
        .createTradePair(base, quote)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve)
        })
      }
    })
  }

  // [sellOrders, buyOrders]
  async orderBookWithTradePair(
    hash: string,
    maxNum = 10
  ): Promise<[OrderLinkedItem[], OrderLinkedItem[]]> {
    return new Promise(resolve => {
      const sellOrders: OrderLinkedItem[] = []
      const buyOrders: OrderLinkedItem[] = []

      const sub = this.api?.query.tradeModule
        .linkedItemList<Option<OrderLinkedItem>>([hash])
        .subscribe(async v => {
          if (!v.isNone) {
            const orderLinkedItem = v.unwrap()

            let prev: BN
            let prevOrderLinkedItem = orderLinkedItem

            for (let i = 0; i < maxNum; i += 1) {
              if (
                !prevOrderLinkedItem.prev ||
                prevOrderLinkedItem.prev.eq(new BN(0))
              ) {
                break
              }
              prev = prevOrderLinkedItem.prev

              // eslint-disable-next-line no-await-in-loop
              const prevLinkedItem = await this.linkedItem(hash, prev)
              if (prevLinkedItem && !prevLinkedItem.isNone) {
                prevOrderLinkedItem = prevLinkedItem.unwrap()
                buyOrders.push(prevOrderLinkedItem)
              }
            }

            let next: BN
            let nextOrderLinkedItem = orderLinkedItem
            for (let i = 0; i < maxNum; i += 1) {
              if (
                !nextOrderLinkedItem.next ||
                nextOrderLinkedItem.next.toString('hex') ===
                  '340282366920938463463374607431768211455'
              ) {
                break
              }
              next = nextOrderLinkedItem.next

              // eslint-disable-next-line no-await-in-loop
              const nextLinkedItem = await this.linkedItem(hash, next)

              if (nextLinkedItem && !nextLinkedItem.isNone) {
                nextOrderLinkedItem = nextLinkedItem.unwrap()
                sellOrders.unshift(nextOrderLinkedItem)
              }
            }
            if (sub) {
              sub.unsubscribe()
            }
            resolve([sellOrders, buyOrders])
          }
        })
    })
  }

  private linkedItem(hash: string, price: BN) {
    return this.api?.query.tradeModule
      .linkedItemList<Option<OrderLinkedItem>>([hash, price])
      .pipe(first())
      .toPromise()
  }

  tradePairObject(hash: string) {
    return this.api?.query.tradeModule
      .tradePairs(hash)
      .pipe(first())
      .toPromise()
  }

  queryBalance(baseHash: string, quoteHash: string) {
    return this.api?.isReady
      .pipe(
        switchMap((api: ApiRx) =>
          combineLatest([
            api.query.tokenModule
              .freeBalanceOf<Balance>([ApiUtils.account, baseHash])
              .pipe(first()),
            api.query.tokenModule
              .freezedBalanceOf<Balance>([ApiUtils.account, baseHash])
              .pipe(first()),
            api.query.tokenModule
              .freeBalanceOf<Balance>([ApiUtils.account, quoteHash])
              .pipe(first()),
            api.query.tokenModule
              .freezedBalanceOf<Balance>([ApiUtils.account, quoteHash])
              .pipe(first())
          ])
        )
      )
      .toPromise<PairBalance>()
  }

  // (AccountId, TradePairHash) => Vec<TradeHash>
  async ownedTradesWithTP(tpHash: string, maxNum = 20) {
    return new Promise(resolve => {
      if (this.api) {
      this.api.query.tradeModule
        .ownedTPTradesIndex([ApiUtils.account, tpHash])
        .subscribe((index: unknown) => {
          const params = Lodash.range(
            Math.min((index as BN).toNumber(), maxNum)
          ).map(i => [ApiUtils.account, tpHash, i])

          this.api!.query.tradeModule.ownedTPTrades
            .multi(params)
            .subscribe(v => {
              resolve(v)
            })
        })
      }
    })
  }

  // (TradePairHash) => Vec<TradeHash>
  async tradesWithTP(tpHash: string, maxNum = 20) {
    return new Promise(resolve => {
      if (this.api) {

      this.api.query.tradeModule
        .tradePairOwnedTradesIndex(tpHash)
        .subscribe((index: unknown) => {
          const params = Lodash.range(
            Math.min((index as BN).toNumber(), maxNum)
          ).map(i => [tpHash, i])

          this.api!.query.tradeModule.tradePairOwnedTrades
            .multi(params)
            .subscribe(v => {
              resolve(v)
            })
        })
      }
    })
  }

  // (AccoundId, Index) => OrderHash
  async ownedOrders() {
    return new Promise(resolve => {
      if (this.api) {
      this.api.query.tradeModule
        .ownedOrdersIndex(ApiUtils.account)
        .subscribe((index: unknown) => {
          const params = Lodash.range((index as BN).toNumber()).map(i => [
            ApiUtils.account,
            i
          ])

          this.api!.query.tradeModule.ownedOrders.multi(params).subscribe(v => {
            resolve(v)
          })
        })
      }
    })
  }
}
