import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import App from './App';
import { GlobalContextMenuProvider } from './features/context-menu';
import { store } from './store';

import './i18n';
import './styles/index.css';

const root = createRoot(document.body);
root.render(
  <Provider store={store}>
    <GlobalContextMenuProvider>
      <App />
      <ToastContainer position="bottom-right" theme="colored" />
    </GlobalContextMenuProvider>
  </Provider>,
);
