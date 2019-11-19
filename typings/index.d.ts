interface TradePairModel { }

interface TradeModel {
	hash: string;
	base: string;
	quote: string;
	buyer: 'AccountId';
	seller: 'AccountId';
	maker: 'AccountId';
	taker: 'AccountId';
	otype: 'OrderType';
	price: 'Price';
	base_amount: 'Balance';
	quote_amount: 'Balance';
}

interface OrderModel { }
