import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';
import { GlobalStyle } from './styles';

const Root: React.SFC = () => (
  <>
    <GlobalStyle />
    <App />
  </>
);

ReactDOM.render(<Root />, document.querySelector('#root'));
