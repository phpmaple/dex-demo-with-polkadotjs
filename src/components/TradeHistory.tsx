import React from 'react'
import { Table } from 'antd'
import { ColumnProps } from 'antd/es/table'
import ApiUtils, { Trade, OrderType } from '../services/APIService'

export interface TradeItem {
  key: number
  trade: Trade
}

interface Props {
  data: TradeItem[]
}

export default (props: Props) => {
  const { data } = props
  const columns: ColumnProps<TradeItem>[] = [
    {
      title: 'Base Amount',
      dataIndex: 'trade.base_amount',
      key: 'base_amount'
    },
    {
      title: 'quote Amount',
      dataIndex: 'trade.quote_amount',
      key: 'quote_amount'
    },
    {
      title: 'Price',
      dataIndex: 'trade.price',
      key: 'price',
      render: (price: number, record: TradeItem, index: number) => (
        <span
          style={
            ApiUtils.account === record.trade.buyer
              ? { color: 'green' }
              : { color: 'red' }
          }
        >
          {price / 10 ** 8}
        </span>
      )
    }
  ]

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>TradeHistory</h3>

      <Table
        columns={columns}
        dataSource={data}
        size="small"
        pagination={false}
      />
    </div>
  )
}
