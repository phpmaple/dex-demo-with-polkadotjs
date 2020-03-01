import React, { FormEvent } from 'react'
import { FormComponentProps } from 'antd/es/form'
import { Form, InputNumber, Button, Radio, Select } from 'antd'
import { RadioChangeEvent } from 'antd/lib/radio'
import { TradePair, PairBalance } from '../services/APIService'

const { Option } = Select

interface OrderCreateFormProps extends FormComponentProps {
  price: number
  amount: number
  pairBalance: PairBalance | undefined
  onsubmit: (type: number, price: number, amount: number) => void
  tradePairExist: TradePair | undefined
  accountChanged: (index: number) => void
}

function hasErrors(fieldsError: Record<string, string[] | undefined>) {
  return Object.keys(fieldsError).some(field => fieldsError[field])
}

interface State {
  type: number
}

class OrderCreate extends React.Component<OrderCreateFormProps, State> {
  constructor(props: OrderCreateFormProps) {
    super(props)
    this.state = {
      type: 1
    }
  }

  componentDidMount() {
    const { form } = this.props

    // To disabled submit button at the beginning.
    form.validateFields()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputValidator = (rule: any, value: any, callback: any) => {
    const { form } = this.props
    const { type } = this.state
    const { isFieldTouched } = form
    const price = form.getFieldValue('price')
    const amount = form.getFieldValue('amount')
    const orderType = type === 1 ? 'sell' : 'buy'

    if (!isFieldTouched('price') || !isFieldTouched('amount')) {
      callback()
      return
    }
    if (!Number.isInteger(amount)) {
      callback(`${orderType} amount is not integer`)
    } else if (!Number.isInteger(price * amount)) {
      callback(`${orderType === 'buy' ? 'sell' : 'buy'} amount is not integer`)
    } else {
      callback()
    }
  }

  handleSubmit = (e: FormEvent) => {
    const { form, onsubmit } = this.props
    const { type } = this.state

    e.preventDefault()
    form.validateFields((err, values) => {
      if (!err) {
        onsubmit(type, values.price, values.amount)
        form.resetFields()
        form.validateFields()
      }
    })
  }

  accountChanged = (v: number) => {
    const { accountChanged } = this.props
    accountChanged(v)
  }

  onRadioChange = (e: RadioChangeEvent) => {
    const { form } = this.props

    this.setState(
      {
        type: e.target.value
      },
      () => {
        form.validateFields(['amount'], { force: true })
      }
    )
  }

  onPriceChange = () => {
    const { form } = this.props

    form.validateFields(['amount'], { force: true })
  }

  render() {
    const { form, pairBalance, tradePairExist } = this.props
    const { type } = this.state

    const {
      getFieldDecorator,
      getFieldsError,
      getFieldError,
      isFieldTouched
    } = form

    // Only show error after a field is touched.
    const priceError = isFieldTouched('price') && getFieldError('price')
    const amountError = isFieldTouched('amount') && getFieldError('amount')

    return (
      <div>
        <h3 style={{ marginBottom: 16 }}>Create Limit Order</h3>

        <span style={{ marginRight: '20px' }}>Current Account: </span>

        <Select
          defaultValue={0}
          style={{ width: 120 }}
          onChange={this.accountChanged}
        >
          <Option value={0}>BOB</Option>
          <Option value={1}>ALICE</Option>
          <Option value={2}>CHARLIE</Option>
          <Option value={3}>DAVE</Option>
          <Option value={4}>EVE</Option>
          <Option value={5}>FERDIE</Option>
        </Select>
        <span style={{ margin: 'auto 20px' }}>
          Base Free Balance:
          {(!pairBalance || (pairBalance[0].toNumber() === 0)) ? '--' : pairBalance[0].toString()}
        </span>
        <span style={{ margin: 'auto 20px' }}>
          Quote Free Balance:
          {(!pairBalance || (pairBalance[2].toNumber() === 0)) ? '--' : pairBalance[2].toString()}
        </span>
        <span style={{ margin: 'auto 20px' }}>
          Base Freezed Balance:
          {(!pairBalance || (pairBalance[1].toNumber() === 0)) ? '--' : pairBalance[1].toString()}
        </span>
        <span style={{ margin: 'auto 20px' }}>
          Quote Freezed Balance:
          {(!pairBalance || (pairBalance[3].toNumber() === 0)) ? '--' : pairBalance[3].toString()}
        </span>

        <Form layout="inline" onSubmit={this.handleSubmit}>
          <Form.Item
            validateStatus={priceError ? 'error' : ''}
            help={priceError || ''}
          >
            {getFieldDecorator('price', {
              validateFirst: true,
              rules: [
                {
                  required: true,
                  message: 'Please input price!'
                }
              ]
            })(
              <InputNumber
                onChange={this.onPriceChange}
                placeholder="price"
                min={0}
                precision={8}
                style={{ width: 180 }}
              />
            )}
          </Form.Item>
          <Form.Item
            validateStatus={amountError ? 'error' : ''}
            help={amountError || ''}
          >
            {getFieldDecorator('amount', {
              validateFirst: true,
              rules: [
                {
                  required: true,
                  message: 'Please input amount!'
                },
                { validator: this.inputValidator }
              ]
            })(
              <InputNumber
                type="amount"
                min={1}
                placeholder="amount"
                style={{ width: 180 }}
              />
            )}
          </Form.Item>
          <Form.Item>
            <Radio.Group onChange={this.onRadioChange} value={type}>
              <Radio value={0}>Buy</Radio>
              <Radio value={1}>Sell</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={
                tradePairExist === undefined || hasErrors(getFieldsError())
              }
            >
              Submit
            </Button>
          </Form.Item>
        </Form>
      </div>
    )
  }
}

export default Form.create<OrderCreateFormProps>({
  // ...
})(OrderCreate)
