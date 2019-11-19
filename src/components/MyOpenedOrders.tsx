import React from 'react';
import { Table, Popconfirm } from 'antd';
import { ColumnProps } from 'antd/es/table';
import BN from 'bn.js';
import { OrderType, Order, OrderStatus } from '../services/APIService';

export interface OrderItem {
  key: number;
  order: Order;
}

interface Props {
  data: OrderItem[];
  cancelCallback: (hash: string) => void;
}

export default (props: Props) => {
  const { data } = props;

  const cancelOrder = (hash: string) => {
    props.cancelCallback(hash);
  };

  const columns: ColumnProps<OrderItem>[] = [
    {
      title: 'Sell Amount',
      dataIndex: 'order.sell_amount',
      key: 'order.sell_amount',
      render: (sellAmount: number, record: OrderItem, index: number) => (
        <span>{sellAmount}</span>
      )
    },
    {
      title: 'Remain Sell Amount',
      dataIndex: 'order.remained_sell_amount',
      key: 'order.remained_sell_amount',
      render: (
        remainedSellAmount: number,
        record: OrderItem,
        index: number
      ) => <span>{remainedSellAmount}</span>
    },
    {
      title: 'Buy Amount',
      dataIndex: 'order.buy_amount',
      key: 'order.buy_amount',
      render: (buyAmount: number, record: OrderItem, index: number) => (
        <span>{buyAmount}</span>
      )
    },
    {
      title: 'Remain Buy Amount',
      dataIndex: 'order.remained_buy_amount',
      key: 'order.remained_buy_amount',
      render: (remainedBuyAmount: number, record: OrderItem, index: number) => (
        <span>{remainedBuyAmount}</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'order.status',
      key: 'order.status',
      render: (status: OrderStatus, record: OrderItem, index: number) => (
        <span>{OrderStatus[status]}</span>
      )
    },
    {
      title: 'Price',
      dataIndex: 'order.price',
      key: 'order.price',
      render: (price: number, record: OrderItem, index: number) => (
        <span
          style={
            record.order.otype === OrderType.Buy
              ? { color: 'green' }
              : { color: 'red' }
          }
        >
          {price / 10 ** 8}
        </span>
      )
    },
    {
      title: 'Action',
      key: 'order.action',
      render: (text: string, record: OrderItem, index: number) => (
        <Popconfirm
          title="Sure to cancel?"
          onConfirm={() => cancelOrder(record.order.hash)}
        >
          <a>Cancel</a>
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>MyOpenedOrders</h3>

      <Table
        columns={columns}
        dataSource={data}
        size="small"
        pagination={false}
      />
    </div>
  );
};
