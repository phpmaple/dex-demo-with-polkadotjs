import { ApiRx, SubmittableResult } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider';
import keyring from '@polkadot/ui-keyring';
import _ from 'lodash';
import BN from 'bn.js';
import { Option, Struct, u128, H256 } from '@polkadot/types';
import { Header, Balance } from '@polkadot/types/interfaces';
import { Observable } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import RuntimeTypes from '../runtimeTypes';

export type Price = u128;
export type Hash = H256;
export type PairBalance = [Balance, Balance, Balance, Balance]; // base free. base freezed. quote free. quote freezed

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
  hash: string;
  base: string;
  quote: string;
  latest_matched_price: number;
  one_day_trade_volume: number;
  one_day_highest_price: number;
  one_day_lowest_price: number;
}

export interface OrderLinkedItem extends Struct {
  prev?: BN;
  next?: BN;
  price?: BN;
  buy_amount: Price;
  sell_amount: Price;
  orders: Hash[];
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
  hash: string;
  base: string;
  quote: string;
  buyer: string;
  seller: string;
  maker: string;
  taker: string;
  otype: OrderType;
  price: number;
  base_amount: number;
  quote_amount: number;
}

export interface Order {
  hash: string;
  base: string;
  quote: string;
  owner: string;
  sell_amount: number;
  buy_amount: number;
  remained_buy_amount: number;
  remained_sell_amount: number;
  otype: OrderType;
  price: number;
  status: OrderStatus;
}

// (TradePairHash, Index) => OrderHash
// export async function tpOwnedOrders(hash: string) {
// 	return new Promise(async (resolve, reject) => {
// 		const api = await _createApi();
// 		api.query.tradeModule
// 			.tradePairOwnedOrdersIndex(hash)
// 			.subscribe((index: unknown) => {
// 				const params = _.range(index as number).map(i => [hash, i]);
// 				api.query.tradeModule.tradePairOwnedOrders
// 					.multi(params)
// 					.subscribe(v => {
// 						resolve(v);
// 					});
// 			});
// 	});
// }

export const AccountIds = [
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // BOB
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // ALICE
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', // CHARLIE
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', // DAVE
  '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw', // EVE
  '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL' // FERDIE
];

let apiInstance: ApiUtils;

export default class ApiUtils {
  public api?: ApiRx;

  private url: string;

  public isLoadKeyring = false;

  static account: string = AccountIds[0]; // BOB

  constructor() {
    if (!apiInstance) {
      apiInstance = this;
    }

    this.url = 'ws://47.100.239.204:9944';
  }

  public static switchAccount(index: number) {
    ApiUtils.account = AccountIds[index];
  }

  public async init() {
    const provider = new WsProvider(this.url);

    this.api = await ApiRx.create({
      provider,
      types: RuntimeTypes.types
    }).toPromise();

    if (!this.isLoadKeyring) {
      keyring.loadAll({ ss58Format: 42, type: 'sr25519' });
      this.isLoadKeyring = true;
    }
  }

  private static getPairFrom() {
    return keyring.getPair(ApiUtils.account);
  }

  subNewBlock() {
    return this.api?.isReady.pipe(
      switchMap(api => api.rpc.chain.subscribeNewHeads())
    );
  }

  private static handlerSubResult(
    result: SubmittableResult,
    resolve: (value?: undefined) => void
  ) {
    console.log(`Status of order: ${result.status.type}`);
    // result.findRecord("tradeModule", "Issued")
    if (result.status.isFinalized) {
      console.log(`Successful order ${result.status.asFinalized.toHex()}`);

      let datajson: any;
      result.events!.forEach(({ phase, event: { data, method, section } }) => {
        datajson = JSON.parse(data.toString());
        resolve({ ...datajson });

        console.log(
          '\t',
          phase.toString(),
          `: ${section}.${method}`,
          data.toString()
        );
      });
    }
  }

  async issueToken(
    symbol: string,
    amount: number
  ): Promise<[string, string, number]> {
    // accountId, hash, amount
    return new Promise((resolve, reject) => {
      const api = this.api!;
      const account = ApiUtils.getPairFrom();
      api.tx.tokenModule
        .issue(symbol, amount)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve);
        });
    });
  }

  async transferTo(accountId: string, tokenHash: string, amount: number) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      const account = ApiUtils.getPairFrom();
      api.tx.tokenModule
        .transfer(tokenHash, accountId, amount)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve);
        });
    });
  }

  async tpOwnedTrades(hash: string) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      api.query.tradeModule
        .tradePairOwnedTrades(hash)
        .subscribe((v: unknown) => {
          console.log(v);
          resolve(v);
        });
    });
  }

  async ordersWith(hash: string[]) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      api.query.tradeModule.orders.multi(hash).subscribe(v => {
        resolve(v);
      });
    });
  }

  async tradesWith(hash: string[]) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      api.query.tradeModule.trades.multi(hash).subscribe(v => {
        resolve(v);
      });
    });
  }

  async cancelOrder(hash: string) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      const account = ApiUtils.getPairFrom();

      api.tx.tradeModule
        .cancelLimitOrder(hash)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve);
        });
    });
  }

  async createLimitOrder(
    base: string,
    quote: string,
    otype: number,
    price: number,
    amount: number
  ): Promise<[string, string, string, string, Order]> {
    // (accountId, baseTokenHash, quoteTokenHash, orderHash, LimitOrder)

    return new Promise((resolve, reject) => {
      console.log('creating ');

      const api = this.api!;
      console.log(api);

      const account = ApiUtils.getPairFrom();
      let sellAmount;
      const realPrice = price * 10 ** 8;

      if (otype === 0) {
        sellAmount = price * amount;
      } else {
        sellAmount = amount;
      }

      const tx = api.tx.tradeModule.createLimitOrder(
        base,
        quote,
        otype,
        realPrice,
        sellAmount
      );
      const signature = tx.signAndSend(account);

      signature.subscribe(value => {
        ApiUtils.handlerSubResult(value, resolve);
      });
    });
  }

  async createTradePair(
    base: string,
    quote: string
  ): Promise<[string, string, TradePair]> {
    // accountId, hash, tp
    return new Promise((resolve, reject) => {
      const api = this.api!;
      const account = ApiUtils.getPairFrom();
      api.tx.tradeModule
        .createTradePair(base, quote)
        .signAndSend(account)
        .subscribe(value => {
          ApiUtils.handlerSubResult(value, resolve);
        });
    });
  }

  // [sellOrders, buyOrders]
  async orderBookWithTradePair(
    hash: string,
    maxNum = 10
  ): Promise<[OrderLinkedItem[], OrderLinkedItem[]]> {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      const sellOrders: OrderLinkedItem[] = [];
      const buyOrders: OrderLinkedItem[] = [];

      api.query.tradeModule
        .linkedItemList<Option<OrderLinkedItem>>([hash])
        .subscribe(async v => {
          if (!v.isNone) {
            const orderLinkedItem = v.unwrap();

            let prev: BN;
            let prevOrderLinkedItem = orderLinkedItem;

            for (let i = 0; i < 10; i += 1) {
              prev = prevOrderLinkedItem.prev!;
              if (prev.eq(new BN(0))) {
                break;
              }

              const prevLinkedItem = await this.linkedItem(hash, prev);
              if (prevLinkedItem && !prevLinkedItem.isNone) {
                prevOrderLinkedItem = prevLinkedItem.unwrap();
                buyOrders.push(prevOrderLinkedItem);
              }
            }

            let next: BN;
            let nextOrderLinkedItem = orderLinkedItem;
            for (let i = 0; i < 10; i += 1) {
              next = nextOrderLinkedItem.next!;

              if (
                next.toString('hex') ===
                '340282366920938463463374607431768211455'
              ) {
                break;
              }

              const nextLinkedItem = await this.linkedItem(hash, next);

              if (nextLinkedItem && !nextLinkedItem.isNone) {
                nextOrderLinkedItem = nextLinkedItem.unwrap();
                sellOrders.unshift(nextOrderLinkedItem);
              }
            }
            resolve([sellOrders, buyOrders]);
          }
        });
    });
  }

  private linkedItem(hash: string, price: BN) {
    return this.api?.query.tradeModule
      .linkedItemList<Option<OrderLinkedItem>>([hash, price])
      .pipe(first())
      .toPromise();
  }

  tradePairObject(hash: string) {
    return this.api?.query.tradeModule
      .tradePairs(hash)
      .pipe(first())
      .toPromise();
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
      .toPromise<PairBalance>();
  }

  // (AccountId, TradePairHash) => Vec<TradeHash>
  async ownedTradesWithTP(tpHash: string, maxNum = 20) {
    return new Promise((resolve, reject) => {
      const api = this.api!;

      api.query.tradeModule
        .ownedTPTradesIndex([ApiUtils.account, tpHash])
        .subscribe((index: unknown) => {
          const params = _.range(
            Math.min((index as BN).toNumber(), maxNum)
          ).map(i => [ApiUtils.account, tpHash, i]);

          api.query.tradeModule.ownedTPTrades.multi(params).subscribe(v => {
            resolve(v);
          });
        });
    });
  }

  // (TradePairHash) => Vec<TradeHash>
  async tradesWithTP(tpHash: string, maxNum = 20) {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      api.query.tradeModule
        .tradePairOwnedTradesIndex(tpHash)
        .subscribe((index: unknown) => {
          const params = _.range(
            Math.min((index as BN).toNumber(), maxNum)
          ).map(i => [tpHash, i]);

          api.query.tradeModule.tradePairOwnedTrades
            .multi(params)
            .subscribe(v => {
              resolve(v);
            });
        });
    });
  }

  // (AccoundId, Index) => OrderHash
  async ownedOrders() {
    return new Promise((resolve, reject) => {
      const api = this.api!;
      api.query.tradeModule
        .ownedOrdersIndex(ApiUtils.account)
        .subscribe((index: unknown) => {
          const params = _.range((index as BN).toNumber()).map(i => [
            ApiUtils.account,
            i
          ]);

          api.query.tradeModule.ownedOrders.multi(params).subscribe(v => {
            resolve(v);
          });
        });
    });
  }
}
