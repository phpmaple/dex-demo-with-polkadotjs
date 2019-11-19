import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { GlobalStyle } from './styles';

const Root = () => (
  <>
    <GlobalStyle />
    <App />
  </>
);

ReactDOM.render(<Root />, document.querySelector('#root'));
