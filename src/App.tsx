import React, { useState, useEffect, useCallback } from "react";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress
} from "@polkadot/extension-dapp";

import {
  Layout,
  Input,
  Icon,
  Button,
  Statistic,
  Row,
  Col,
  Card,
  message
} from "antd";
import { Option, Struct, H256, u128 as U128, TypeRegistry } from "@polkadot/types";
import OrderBook from "./components/OrderBook";
import TradeHistory, { TradeItem } from "./components/TradeHistory";
import MyOpenedOrders, { OrderItem } from "./components/MyOpenedOrders";
import MyOrders from "./components/MyOrders";
import MyTrades from "./components/MyTrades";

import OrderCreate from "./components/OrderCreate";
import ApiUtils, {
  TradePair,
  Order,
  OrderStatus,
  Trade,
  OrderLinkedItem,
  PairBalance,
  AccountIds
} from "./services/APIService";

const { Content } = Layout;

const api = new ApiUtils();

export const App: React.FC = () => {
  const [tradePair, setTradePair] = useState("");
  const [tpObject, setTpObject] = useState<TradePair | undefined>(undefined);
  const [myOpenedOrders, setMyOpenedOrders] = useState<OrderItem[]>([]);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [myTrades, setMyTrades] = useState<TradeItem[]>([]);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [orderBooks, setOrderBooks] = useState<
    [OrderLinkedItem[], OrderLinkedItem[]]
  >([[], []]);

  const [pairBalance, setPairBalance] = useState<PairBalance>();

  const fetchTradePairCallback = useCallback(
  async () => {
    const tp = await api.tradePairObject(tradePair);

    if (tp) {
      const newTpObject = JSON.parse(tp.toString()) as TradePair;

      setTpObject({ ...newTpObject });
    }
  },
  [tradePair],
);


  useEffect(() => {
    (async () => {
      // await web3Enable("my cool dapp");
      // const allAccounts = await web3Accounts();

      await api.init();
      setPairBalance(
           [new U128(api.registry!, 0), new U128(api.registry!, 0), new U128(api.registry!, 0), new U128(api.registry!, 0)]
        );
      // if (allAccounts.length > 0) {
      //   const injector = await web3FromAddress(allAccounts[0].address);
      //   api.setSigner(injector.signer);
      // }
    })();
  }, []);

  useEffect(() => {
    const unsub = api.subNewBlock()?.subscribe(async () => {
      await fetchTradePairCallback();
    });
    return () => {
      if (unsub) {
        unsub.unsubscribe();
      }
    };
  }, [fetchTradePairCallback, tradePair]);

  useEffect(() => {
    (async () => {
      if (tradePair !== "") {
        await fetchTradePairCallback();
      }
    })();
  }, [fetchTradePairCallback, tradePair]);

  useEffect(() => {
    (async () => {
      const newTpObject = tpObject as TradePair;
      if (newTpObject) {
        // order book
        const [sellOrders, buyOrders] = await api.orderBookWithTradePair(
          newTpObject.hash
        );
        setOrderBooks([sellOrders, buyOrders]);

        // my balance
        const balances = await api.queryBalance(
          newTpObject.base,
          newTpObject.quote
        );

        setPairBalance(
          balances ?? [new U128(api.registry!, 0), new U128(api.registry!, 0), new U128(api.registry!, 0), new U128(api.registry!, 0)]
        );

        // my orders and opened orders
        const myHashOrders = (await api.ownedOrders()) as Option<H256>[];
        const hexHashOrders = myHashOrders.map(v => v.unwrap().toHex());
        const myRawOrders = (await api.ordersWith(hexHashOrders)) as Option<
          Struct
        >[];
        const myOrder = myRawOrders.map(
          v => JSON.parse(v.unwrap().toString()) as Order
        );
        const myTpOrders = myOrder.filter(
          v => v.base === newTpObject.base && v.quote === newTpObject.quote
        );

        const myTpOpenedOrders = myTpOrders.filter(v => {
          return (
            v.status === OrderStatus.Created ||
            v.status === OrderStatus.PartialFilled
          );
        });
        const myTpClosedOrders = myTpOrders.filter(v => {
          return (
            v.status === OrderStatus.Filled || v.status === OrderStatus.Canceled
          );
        });

        setMyOpenedOrders(
          myTpOpenedOrders
            .reverse()
            .slice(0, 20)
            .map((v, i) => {
              return { key: i, order: v };
            })
        );
        setMyOrders(
          myTpClosedOrders
            .reverse()
            .slice(0, 20)
            .map((v, i) => {
              return { key: i, order: v };
            })
        );

        // my trades
        const ownedtpTrades = (await api.ownedTradesWithTP(
          newTpObject.hash
        )) as Option<H256>[];

        const hexHashTrades = ownedtpTrades.map(v => v.unwrap().toHex());
        const myRawTrades = (await api.tradesWith(hexHashTrades)) as Option<
          Struct
        >[];

        const myTrade = myRawTrades.map(
          v => JSON.parse(v.unwrap().toString()) as Trade
        );

        setMyTrades(
          myTrade.reverse().map((v, i) => {
            return { key: i, trade: v };
          })
        );

        // trade history
        const tpTrades = (await api.tradesWithTP(newTpObject.hash)) as Option<
          H256
        >[];

        const hexHashTpTrades = tpTrades.map(v => v.unwrap().toHex());
        const rawTrades = (await api.tradesWith(hexHashTpTrades)) as Option<
          Struct
        >[];

        const latestTrades = rawTrades.map(
          v => JSON.parse(v.unwrap().toString()) as Trade
        );

        setTrades(
          latestTrades.reverse().map((v, i) => {
            return { key: i, trade: v };
          })
        );
      }
    })();
  }, [tpObject]);

  // create demo
  async function createTokenAndTradePair(): Promise<string | null> {
    const nonce = (await api.nonce())?.toNumber();
    if (nonce === undefined) {
      return null
    }
    const [baseResult, quoteResult] = await Promise.all([
      api.issueToken("0x90", 6000000, nonce),
      api.issueToken("0x80", 6000000, nonce + 1)
    ]);
    const tpResult = await api.createTradePair(baseResult[1], quoteResult[1]);
    console.log(tpResult);

    const promiseAll: Promise<unknown>[] = [];

    const nextNonce = (await api.nonce())?.toNumber();
    if (nextNonce === undefined) {
      return null;
    }
    AccountIds.forEach((account, index) => {
      promiseAll.push(
        api.transferTo(account, baseResult[1], 100000, nextNonce + index * 2)
      );
      promiseAll.push(
        api.transferTo(
          account,
          quoteResult[1],
          100000,
          nextNonce + index * 2 + 1
        )
      );
    });

    await Promise.all(promiseAll);
    console.log(tpResult[2].hash);

    return tpResult[2].hash;
  }

  const generatePair = async (): Promise<void> => {
    message.loading({
      content: "Action in progress..",
      key: generatePair.name,
      duration: 0
    });
    const pair = await createTokenAndTradePair();
    if (pair) {
      setTradePair(pair);
    }
    message.success({
      content: "trade pair created success..",
      key: generatePair.name
    });
  };

  const createOrder = async (
    type: number,
    price: number,
    amount: number
  ): Promise<void> => {
    message.loading({
      content: "Action in progress..",
      key: createOrder.name,
      duration: 0
    });

    await api.createLimitOrder(
      (tpObject as TradePair).base,
      (tpObject as TradePair).quote,
      type,
      price,
      amount
    );

    await fetchTradePairCallback();
    message.success({
      content: "limit order created success..",
      key: createOrder.name
    });
  };

  const cancelOrder = async (hash: string): Promise<void> => {
    message.loading({
      content: "Action in progress..",
      key: createOrder.name,
      duration: 0
    });

    await api.cancelOrder(hash);
    await fetchTradePairCallback();
    message.success({
      content: "Order canceled success..",
      key: createOrder.name
    });
  };

  const accountChanged = async (index: number): Promise<void> => {
    ApiUtils.switchAccount(index);

    await fetchTradePairCallback();
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <div style={{ marginTop: "20px", display: "flex" }}>
        <div
          style={{
            margin: "auto 20px"
          }}
        >
          TradePair Hash :
        </div>
        <Input
          value={tradePair}
          onChange={e => setTradePair(e.target.value)}
          style={{ width: "500px" }}
          size="large"
          prefix={<Icon type="number" style={{ color: "rgba(0,0,0,.25)" }} />}
          type="hash"
          placeholder="hash"
        />
        <Button
          onClick={generatePair}
          type="primary"
          shape="circle"
          icon="plus-circle"
          style={{ margin: "auto 10px", marginRight: "40px" }}
        />
        <OrderCreate
          pairBalance={pairBalance}
          price={0}
          amount={0}
          onsubmit={createOrder}
          tradePairExist={tpObject}
          accountChanged={accountChanged}
        />
      </div>
      <Row
        type="flex"
        justify="center"
        align="stretch"
        style={{ margin: "20px 50px" }}
      >
        <Col span={8}>
          <Card style={{ height: "100%" }} size="small">
            <Statistic
              title="Latest Price"
              value={
                tpObject === undefined
                  ? "--"
                  : tpObject.latest_matched_price / 10 ** 8
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="24h High"
              value={
                tpObject === undefined
                  ? "--"
                  : tpObject.one_day_highest_price / 10 ** 8
              }
            />
            <Statistic
              title="24h Low"
              value={
                tpObject === undefined
                  ? "--"
                  : tpObject.one_day_lowest_price / 10 ** 8
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ height: "100%" }} size="small">
            <Statistic
              title="24h Volume"
              value={
                tpObject === undefined ? "--" : tpObject.one_day_trade_volume
              }
            />
          </Card>
        </Col>
      </Row>
      <Content
        style={{
          padding: "0 24px",
          margin: "16px 0",
          display: "flex"
        }}
      >
        <OrderBook
          buyOrders={orderBooks[1]}
          sellOrders={orderBooks[0]}
          lastestPrice={
            tpObject === undefined ? 0 : tpObject.latest_matched_price
          }
        />
        <div style={{ width: "100px" }} />
        <TradeHistory data={trades} />
        <div style={{ width: "100px" }} />
        <MyOpenedOrders data={myOpenedOrders} cancelCallback={cancelOrder} />
        <div style={{ width: "100px" }} />
        <MyOrders data={myOrders} />
        <div style={{ width: "100px" }} />
        <MyTrades data={myTrades} />
        <div style={{ width: "100px" }} />
      </Content>
    </Layout>
  );
};
