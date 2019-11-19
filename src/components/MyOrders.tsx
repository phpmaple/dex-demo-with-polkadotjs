import React from 'react';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';
import BN from 'bn.js';
import { OrderType, Order, OrderStatus } from '../services/APIService';

export interface OrderItem {
  key: number;
  order: Order;
}

interface Props {
  data: OrderItem[];
}

export default (props: Props) => {
  const { data } = props;

  const columns: ColumnProps<OrderItem>[] = [
    {
      title: 'Sell Amount',
      dataIndex: 'order.sell_amount',
      key: 'sell_amount',
      render: (sellAmount: number, record: OrderItem, index: number) => (
        <span>{sellAmount}</span>
      )
    },
    {
      title: 'Buy Amount',
      dataIndex: 'order.buy_amount',
      key: 'buy_amount',
      render: (buyAmount: number, record: OrderItem, index: number) => (
        <span>{buyAmount}</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'order.status',
      key: 'status',
      render: (status: OrderStatus, record: OrderItem, index: number) => (
        <span>{OrderStatus[status]}</span>
      )
    },
    {
      title: 'Price',
      dataIndex: 'order.price',
      key: 'price',
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
    }
  ];

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>MyOrders</h3>

      <Table
        columns={columns}
        dataSource={data}
        size="small"
        pagination={false}
      />
    </div>
  );
};
