import React from 'react'
import { Table } from 'antd'
import { ColumnProps } from 'antd/es/table'
import BN from 'bn.js'
import { OrderLinkedItem } from '../services/APIService'

interface Props {
  buyOrders: OrderLinkedItem[]
  sellOrders: OrderLinkedItem[]
  lastestPrice: number
}

export default (props: Props) => {
  const { buyOrders, sellOrders, lastestPrice } = props

  const sellColumns: ColumnProps<OrderLinkedItem>[] = [
    {
      title: 'Sell Amount',
      dataIndex: 'sell_amount',
      key: 'sell_amount',
      align: 'left',
      render: (amount: BN, record: OrderLinkedItem, index: number) => (
        <span style={{ color: 'red' }}>{amount.toNumber()}</span>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (price: number, record: OrderLinkedItem, index: number) => (
        <span style={{ color: 'red' }}>{price / 10 ** 8}</span>
      )
    }
  ]

  const buyColumns: ColumnProps<OrderLinkedItem>[] = [
    {
      title: 'Buy Amount',
      dataIndex: 'buy_amount',
      key: 'buy_amount',
      align: 'left',
      render: (amount: BN, record: OrderLinkedItem, index: number) => (
        <span style={{ color: 'green' }}>{amount.toNumber()}</span>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (price: number, record: OrderLinkedItem, index: number) => (
        <span style={{ color: 'green' }}>{price / 10 ** 8}</span>
      )
    }
  ]

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>OrderBook</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Amount</span>

        <span>Price</span>
      </div>
      <Table
        columns={sellColumns}
        dataSource={sellOrders}
        size="small"
        pagination={false}
        showHeader={false}
        rowKey={record => record.price!.toString()}
      />
      <div style={{ textAlign: 'center' }}>
        <span>{lastestPrice === 0 ? '--' : lastestPrice / 10 ** 8}</span>
      </div>
      <Table
        rowKey={record => record.price!.toString()}
        columns={buyColumns}
        dataSource={buyOrders}
        size="small"
        pagination={false}
        showHeader={false}
        bordered={false}
      />
    </div>
  )
}
